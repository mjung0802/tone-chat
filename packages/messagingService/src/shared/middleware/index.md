# shared/middleware/

- **verifyUserToken.ts** — `verifyUserToken()` — verifies `X-User-Token` JWT with `config.jwtSecret`; sets `req.userId = payload.sub`; returns 401 if missing or invalid
- **verifyUserToken.test.ts** — unit tests for verifyUserToken (missing, wrong secret, expired, valid)
- **requireMember.ts** — `requireMember()` — reads `req.userId` (set by verifyUserToken); checks ServerMember record; attaches member to `req.member`
- **requireMember.test.ts** — unit tests for requireMember
- **internalAuth.ts** — `internalAuth()` — validates `X-Internal-Key` header
- **errorHandler.ts** — `errorHandler()` middleware + `AppError` class — formats AppError with code/message/status; logs unhandled errors
