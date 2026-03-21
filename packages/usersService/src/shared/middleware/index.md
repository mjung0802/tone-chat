# shared/middleware/

- **internalAuth.ts** — validates `x-internal-key` header; returns 401 if mismatch
- **errorHandler.ts** — `errorHandler()` + `AppError` class — standardized error responses with code/message/status
