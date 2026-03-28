# packages/usersService — User Authentication Service

Express service on :3002 + PostgreSQL. Manages global user accounts, bcrypt auth, JWT issuance/refresh, and email OTP verification.

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `config/` | PostgreSQL config + connection |
| `db/` | Migration runner + SQL migration files |
| `auth/` | Registration, login, refresh, email OTP verification |
| `email/` | Nodemailer SMTP wrapper; dev console fallback |
| `users/` | User profile read/update; batch lookup; email stripped on all responses; friend management (send/accept/remove requests, list friends, friendship status) |
| `shared/` | `User`/`RefreshToken` types + `hashSha256` + middleware |

## Key Files
- `src/app.ts` — Express app with internalAuth on all routes
- `src/auth/auth.service.ts` — core auth logic; atomic refresh token rotation
- `src/auth/verification.service.ts` — OTP generation and verification
- `src/users/users.service.ts` — DB queries; allowlisted update fields
- `src/shared/types.ts` — canonical `User` interface

## Integration Tests
- `auth.integration.test.ts` / `users.integration.test.ts`
