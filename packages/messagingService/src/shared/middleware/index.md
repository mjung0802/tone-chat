# shared/middleware/

- **requireMember.ts** — `requireMember()` — validates `X-User-Id` header; checks ServerMember record; attaches member to `req.member`
- **requireMember.test.ts** — unit tests for requireMember
- **internalAuth.ts** — `internalAuth()` — validates `X-Internal-Key` header
- **errorHandler.ts** — `errorHandler()` middleware + `AppError` class — formats AppError with code/message/status; logs unhandled errors
