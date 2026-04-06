# shared/middleware/

- **auth.ts** — `AuthRequest` interface, `requireAuth()` — validates JWT from `Authorization: Bearer` header; extracts `sub` as userId and stores raw token on `req.token`
- **auth.test.ts** — unit tests for auth middleware
- **errorHandler.ts** — `errorHandler()` — global error handler; logs + returns 500 JSON
