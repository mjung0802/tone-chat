# shared/middleware/

- **verifyUserToken.ts** — `verifyUserToken()` — verifies `X-User-Token` JWT with `config.jwtSecret`; sets `req.userId = payload.sub`; returns 401 if missing or invalid
- **internalAuth.ts** — validates `x-internal-key` header; returns 401 if mismatch
- **errorHandler.ts** — `errorHandler()` + `AppError` class — standardized error responses with code/message/status
