# Security Audit Summary

This document summarizes the security hardening applied to the tone-chat codebase. All changes are covered by the existing 162-test suite.

## Phase 1: SQL & NoSQL Injection Prevention

**Problem**: Raw string interpolation in SQL queries; unvalidated types in MongoDB filter parameters.

**Fix**:

- All SQL in `usersService` uses postgres.js tagged templates (`sql\`...\``) — never `sql.unsafe()`.
- `updateUser()` validates field names against an explicit `ALLOWED_UPDATE_FIELDS` Set before building the update clause.
- MongoDB query parameters in `messagingService` are type-checked before use in filters to prevent operator injection.

**Key files**:

- `packages/usersService/src/users/users.service.ts` — field allowlist, parameterized queries
- `packages/usersService/src/auth/auth.service.ts` — parameterized queries, SHA-256 token hashing, atomic refresh-token rotation

## Phase 2: Authorization Middleware

**Problem**: messagingService routes had no server-membership or admin-role checks — any authenticated user could access any server's data.

**Fix**:

- `requireMember` middleware: validates `x-user-id`, queries `ServerMember`, returns 401/403, attaches `req.member`.
- `requireAdmin` middleware: chains `requireMember`, then checks `role === 'admin'`.
- Applied to all channel, message, member, and invite routes.

**Key files**:

- `packages/messagingService/src/shared/middleware/requireMember.ts`
- `packages/messagingService/src/shared/middleware/requireAdmin.ts`
- `packages/messagingService/src/shared/middleware/requireMember.test.ts`
- Route files: `channels.routes.ts`, `messages.routes.ts`, `members.routes.ts`, `invites.routes.ts`

## Phase 3: Input Validation & File Upload Security

**Problem**: Socket.IO events accepted arbitrary payloads. File uploads had no type or size restrictions. Filenames could contain path-traversal sequences.

**Fix**:

- `isValidSendMessage()` and `isValidChannelRef()` type guards validate all socket event data (string types, content length 1–4000, attachment array max 10).
- Multer `fileFilter` restricts uploads to an allowlisted set of MIME types (images, select video/audio, PDF, plain text).
- 25 MB max file size enforced at multer level and double-checked in service.
- `sanitizeFilename()` strips path components (`path.basename`) and control characters.

**Key files**:

- `packages/server/src/messages/messages.socket.ts` — type guards
- `packages/attachmentsService/src/attachments/upload.middleware.ts` — MIME allowlist, size limit
- `packages/attachmentsService/src/attachments/attachments.service.ts` — filename sanitization, size check

## Phase 4: Configuration & Secrets Hardening

**Problem**: All secrets had dev defaults with no guard against deploying them to production. CORS was open.

**Fix**:

- Each service has a `validateConfig()` function called at startup. In production (`NODE_ENV=production`), it throws if any secret still has its dev default value.
- CORS origin controlled via `ALLOWED_ORIGINS` env var (comma-separated), defaults to `http://localhost:8081` for dev.

**Key files**:

- `packages/server/src/config/index.ts`
- `packages/usersService/src/config/index.ts`
- `packages/messagingService/src/config/index.ts`
- `packages/attachmentsService/src/config/index.ts`

**Environment variables validated in production**:

| Variable           | Service(s)           | Dev default                       |
| ------------------ | -------------------- | --------------------------------- |
| `JWT_SECRET`       | server, usersService | `dev-secret-change-in-production` |
| `INTERNAL_API_KEY` | all four services    | `dev-internal-key`                |
| `S3_ACCESS_KEY`    | attachmentsService   | `minioadmin`                      |
| `S3_SECRET_KEY`    | attachmentsService   | `minioadmin`                      |
| `ALLOWED_ORIGINS`  | server               | `http://localhost:8081`           |

## Phase 5: Rate Limiting & Data Exposure

**Problem**: Auth endpoints had no brute-force protection. `getUser()` returned email addresses to any caller.

**Fix**:

- `express-rate-limit` applied to auth routes: login (5/15 min), register (3/hr), refresh (10/15 min).
- `getUser()` strips the `email` field before returning user data.

**Key files**:

- `packages/server/src/auth/auth.rateLimit.ts`
- `packages/server/src/auth/auth.routes.ts`
- `packages/usersService/src/users/users.controller.ts` — email stripping

## Accepted Risks & Future Work

- **Tokens in localStorage**: JWTs are stored client-side via Zustand/SecureStore. Moving to httpOnly cookies would improve XSS resilience but requires changes to the Expo/React Native auth flow.
- **Attachment access control**: Uploaded files are currently accessible via pre-signed S3 URLs without per-user authorization checks. A future improvement would verify server membership before generating download URLs.
- **Socket.IO room authorization**: `join_channel` verifies membership, but room membership is not re-validated if a user is removed from a server mid-session. A `leave_server` event or periodic re-check would close this gap.
