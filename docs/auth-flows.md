# Auth Flows — UsersService

This document describes all authentication flows supported by the Tone Chat platform. The **usersService** owns identity, credentials, and token lifecycle. The **BFF server** acts as the sole internet-facing gateway — it verifies JWTs locally, enforces rate limits, and forwards requests to usersService with internal headers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Registration](#registration)
3. [Login](#login)
4. [Token Refresh](#token-refresh)
5. [Email Verification](#email-verification)
6. [Resend Verification Email](#resend-verification-email)
7. [Logout](#logout)
8. [Error Codes Reference](#error-codes-reference)
9. [Rate Limits](#rate-limits)
10. [Token Storage & Security Notes](#token-storage--security-notes)

---

## Architecture Overview

```
Client ──── HTTPS ────► BFF Server (:4000)
                            │
                   X-Internal-Key header
                            │
                            ▼
                    usersService (:3002)
                            │
                            ▼
                       PostgreSQL
                      (users, credentials,
                    refresh_tokens,
               email_verification_tokens)
```

All routes require the `X-Internal-Key` header, set by the BFF (never by the client). Routes that act on behalf of a specific user also receive an `X-User-Id` header extracted from the verified JWT.

**BFF client-facing base path**: `/api/v1/auth`

---

## Registration

### Endpoint

```
POST /api/v1/auth/register
```

### Request Body

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `username` | string | required, unique |
| `email` | string | required, unique, valid email |
| `password` | string | required, min 8 characters |

### Success Response — `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "alice",
    "email": "alice@example.com",
    "email_verified": false,
    "display_name": null,
    "pronouns": null,
    "avatar_url": null,
    "status": "offline",
    "bio": null,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  },
  "accessToken": "<JWT — expires in 15 minutes>",
  "refreshToken": "<opaque token — expires in 7 days>"
}
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF Server
    participant U as usersService
    participant DB as PostgreSQL
    participant E as Email (SMTP)

    C->>B: POST /api/v1/auth/register<br/>{username, email, password}
    B->>B: Rate limit check (3 req/hr)
    B->>U: POST /auth/register<br/>X-Internal-Key: ***
    U->>DB: Check username & email uniqueness
    DB-->>U: OK (no conflicts)
    U->>DB: INSERT INTO users
    U->>DB: INSERT INTO credentials (bcrypt hash, 12 rounds)
    U->>U: Generate access token (JWT, 15m)
    U->>U: Generate refresh token (random 40-byte hex)
    U->>DB: INSERT INTO refresh_tokens (SHA-256 hash, 7d TTL)
    U-->>B: 201 {user, accessToken, refreshToken}
    B-->>C: 201 {user, accessToken, refreshToken}
    U-->>E: Send 6-digit OTP email (async, non-blocking)
```

### Notes

- Password hashed with **bcrypt, 12 rounds** before storage. The plaintext password never persists.
- The verification email is sent **asynchronously** — a failure to send the email does not fail registration.
- In development (no `SMTP_HOST` configured), the OTP is **logged to the usersService console** instead of emailed.
- The returned `accessToken` is usable immediately; however, some features may require `email_verified: true`.

---

## Login

### Endpoint

```
POST /api/v1/auth/login
```

### Request Body

```json
{
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

### Success Response — `200 OK`

```json
{
  "user": { ...same shape as registration... },
  "accessToken": "<JWT — expires in 15 minutes>",
  "refreshToken": "<opaque token — expires in 7 days>"
}
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF Server
    participant U as usersService
    participant DB as PostgreSQL

    C->>B: POST /api/v1/auth/login {email, password}
    B->>B: Rate limit check (5 req/15 min)
    B->>U: POST /auth/login<br/>X-Internal-Key: ***
    U->>DB: SELECT user WHERE email = ?
    DB-->>U: user row
    U->>DB: SELECT password_hash WHERE user_id = ?
    DB-->>U: password_hash
    U->>U: bcrypt.compare(password, hash)
    alt Invalid credentials
        U-->>B: 401 {error: INVALID_CREDENTIALS}
        B-->>C: 401 {error: INVALID_CREDENTIALS}
    else Valid credentials
        U->>U: Generate access token (JWT, 15m)
        U->>U: Generate refresh token (random 40-byte hex)
        U->>DB: INSERT INTO refresh_tokens (SHA-256 hash, 7d TTL)
        U-->>B: 200 {user, accessToken, refreshToken}
        B-->>C: 200 {user, accessToken, refreshToken}
    end
```

### Notes

- Uses **constant-time** bcrypt comparison to prevent timing attacks.
- On successful login, a **new** refresh token is issued and stored. Any previously issued refresh tokens remain valid until they are used or expire.

---

## Token Refresh

### Endpoint

```
POST /api/v1/auth/refresh
```

### Request Body

```json
{
  "refreshToken": "<opaque token from login or previous refresh>"
}
```

### Success Response — `200 OK`

```json
{
  "accessToken": "<new JWT — expires in 15 minutes>",
  "refreshToken": "<new opaque token — expires in 7 days>"
}
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF Server
    participant U as usersService
    participant DB as PostgreSQL

    C->>B: POST /api/v1/auth/refresh {refreshToken}
    B->>B: Rate limit check (10 req/15 min)
    B->>U: POST /auth/refresh<br/>X-Internal-Key: ***
    U->>U: SHA-256 hash of provided token
    U->>DB: DELETE FROM refresh_tokens WHERE token_hash = ?<br/>RETURNING *  (atomic)
    alt Token not found
        DB-->>U: no rows
        U-->>B: 401 {error: INVALID_TOKEN}
        B-->>C: 401 {error: INVALID_TOKEN}
    else Token found but expired
        DB-->>U: expired row
        U-->>B: 401 {error: TOKEN_EXPIRED}
        B-->>C: 401 {error: TOKEN_EXPIRED}
    else Token valid
        DB-->>U: valid row (token now deleted)
        U->>U: Generate new access token (JWT, 15m)
        U->>U: Generate new refresh token (random 40-byte hex)
        U->>DB: INSERT INTO refresh_tokens (SHA-256 hash, 7d TTL)
        U-->>B: 200 {accessToken, refreshToken}
        B-->>C: 200 {accessToken, refreshToken}
    end
```

### Notes

- The old refresh token is **atomically consumed** (DELETE…RETURNING). This prevents the same token from being used twice — even under concurrent requests.
- If the same refresh token is sent twice simultaneously, only one will succeed; the other will receive `INVALID_TOKEN`.
- Clients must store the **new** refresh token immediately upon receiving the response and discard the old one.

---

## Email Verification

### Endpoint

```
POST /api/v1/auth/verify-email
Authorization: Bearer <accessToken>
```

### Request Body

```json
{
  "code": "482910"
}
```

### Success Response — `200 OK`

```json
{
  "message": "Email verified"
}
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF Server
    participant U as usersService
    participant DB as PostgreSQL

    note over C: User receives 6-digit OTP by email after registration
    C->>B: POST /api/v1/auth/verify-email<br/>Authorization: Bearer <accessToken><br/>{code: "482910"}
    B->>B: Rate limit check (10 req/15 min)
    B->>B: requireAuth — verify JWT, extract userId
    B->>U: POST /auth/verify-email<br/>X-Internal-Key: ***<br/>X-User-Id: <userId><br/>{code: "482910"}
    U->>U: SHA-256 hash of provided code
    U->>DB: DELETE FROM email_verification_tokens<br/>WHERE user_id = ? AND code_hash = ?<br/>RETURNING *  (atomic)
    alt Code not found
        DB-->>U: no rows
        U-->>B: 400 {error: INVALID_CODE}
        B-->>C: 400 {error: INVALID_CODE}
    else Code found but expired (> 15 minutes old)
        DB-->>U: expired row
        U-->>B: 400 {error: CODE_EXPIRED}
        B-->>C: 400 {error: CODE_EXPIRED}
    else Code valid
        DB-->>U: valid row (code now deleted)
        U->>DB: UPDATE users SET email_verified = TRUE WHERE id = ?
        U-->>B: 200 {message: "Email verified"}
        B-->>C: 200 {message: "Email verified"}
    end
```

### Notes

- The OTP is a **6-digit numeric code** stored as a SHA-256 hash in the database.
- OTPs expire after **15 minutes**.
- The code is consumed on use — it cannot be reused.
- Requires a valid `accessToken` in the `Authorization` header.

---

## Resend Verification Email

### Endpoint

```
POST /api/v1/auth/resend-verification
Authorization: Bearer <accessToken>
```

### Request Body

*(empty)*

### Success Response — `200 OK`

```json
{
  "message": "Verification email sent"
}
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant B as BFF Server
    participant U as usersService
    participant DB as PostgreSQL
    participant E as Email (SMTP)

    C->>B: POST /api/v1/auth/resend-verification<br/>Authorization: Bearer <accessToken>
    B->>B: Rate limit check (5 req/hr)
    B->>B: requireAuth — verify JWT, extract userId
    B->>U: POST /auth/resend-verification<br/>X-Internal-Key: ***<br/>X-User-Id: <userId>
    U->>DB: DELETE FROM email_verification_tokens WHERE user_id = ?
    U->>U: Generate new 6-digit OTP
    U->>U: SHA-256 hash of OTP
    U->>DB: INSERT INTO email_verification_tokens (code_hash, 15m TTL)
    U->>E: Send new OTP email
    U-->>B: 200 {message: "Verification email sent"}
    B-->>C: 200 {message: "Verification email sent"}
```

### Notes

- Any existing pending codes for this user are deleted before issuing a new one.
- Requires a valid `accessToken` in the `Authorization` header.
- In development, the OTP is logged to the usersService console instead of emailed.

---

## Logout

There is no dedicated logout endpoint. Logout is handled client-side:

1. **Delete** the stored `accessToken` and `refreshToken` from secure storage.
2. Optionally, **do not call** `/auth/refresh` again — the refresh token will expire naturally after 7 days.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as SecureStore (device)

    C->>S: delete accessToken
    C->>S: delete refreshToken
    note over C: User is now logged out.<br/>Refresh token expires server-side in 7 days.
```

### Notes

- Access tokens are short-lived (15 minutes) and cannot be revoked server-side.
- If you need immediate invalidation (e.g., account compromise), use the token rotation property: once the stored refresh token is deleted client-side, no new access tokens can be issued.
- Future work: server-side token blacklist or `DELETE /auth/logout` endpoint that deletes the refresh token row.

---

## Error Codes Reference

All errors follow the shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "status": 400
  }
}
```

| Code | HTTP Status | Trigger |
|------|-------------|---------|
| `MISSING_FIELDS` | 400 | Required field(s) absent from request body |
| `PASSWORD_TOO_SHORT` | 400 | Password is fewer than 8 characters |
| `USERNAME_TAKEN` | 409 | Provided username is already registered |
| `EMAIL_TAKEN` | 409 | Provided email is already registered |
| `INVALID_CREDENTIALS` | 401 | Email not found or password does not match |
| `INVALID_TOKEN` | 401 | Refresh token not found (already used or never issued) |
| `TOKEN_EXPIRED` | 401 | Refresh token found but past its expiry date |
| `INVALID_CODE` | 400 | Email verification code not found |
| `CODE_EXPIRED` | 400 | Email verification code found but past its 15-minute window |
| `MISSING_TOKEN` | 401 | `Authorization` header missing on a protected route |
| `UNAUTHORIZED` | 401 | JWT invalid or expired on a protected route |

---

## Rate Limits

Rate limits are enforced by the BFF server using `express-rate-limit`. Exceeding the limit returns **429 Too Many Requests**.

| Endpoint | Limit |
|----------|-------|
| `POST /auth/register` | 3 requests per hour per IP |
| `POST /auth/login` | 5 requests per 15 minutes per IP |
| `POST /auth/refresh` | 10 requests per 15 minutes per IP |
| `POST /auth/verify-email` | 10 requests per 15 minutes per IP |
| `POST /auth/resend-verification` | 5 requests per hour per IP |

---

## Token Storage & Security Notes

### Client Storage

| Token | Storage | Rationale |
|-------|---------|-----------|
| `accessToken` (JWT) | Zustand in-memory + `expo-secure-store` | SecureStore uses Keychain (iOS) / Keystore (Android) |
| `refreshToken` (opaque) | `expo-secure-store` | Same secure hardware-backed storage |

### Token Properties

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| Format | JWT (signed HS256) | Random 40-byte hex (opaque) |
| Expiry | 15 minutes | 7 days |
| Storage (server) | Stateless — not stored | SHA-256 hash in `refresh_tokens` table |
| Rotation | Issued on every login/register | Rotated on every `/auth/refresh` call |
| Revocation | Not revocable (short TTL is the mitigation) | Revoked on use (atomic DELETE) |

### Key Security Properties

- **No plaintext secrets in the database** — passwords are bcrypt-hashed, refresh tokens and OTPs are SHA-256-hashed before storage.
- **Atomic token rotation** — the `DELETE … RETURNING` pattern prevents refresh token reuse under concurrent requests.
- **Short-lived access tokens** — 15-minute TTL limits the window of exposure if a JWT is intercepted.
- **Internal network isolation** — usersService is not internet-exposed. All traffic arrives from the BFF with a shared `X-Internal-Key`.
