# shared/

- **serviceClient.ts** — `ServiceResponse` interface, `serviceRequest()` — unified HTTP client for backend services; attaches `X-Internal-Key` and `X-User-Token` headers
- **serviceClient.test.ts** — unit tests for serviceClient
- **rateLimiters.ts** — `createPerUserRateLimiter(windowMs, limit, message)` — factory wrapping `express-rate-limit` keyed by `userId` (falls back to IP); `mutationLimiters` — pre-built limiters: `message` (30/min), `serverWrite` (10/10min), `invite` (20/10min), `memberAction` (30/10min)
- **validate.ts** — `validateBody(schema): RequestHandler` — Zod-based Express middleware; parses `req.body` against schema, returns 400 `VALIDATION_ERROR` on failure, replaces `req.body` with parsed data on success; exports all BFF request schemas: `createMessageSchema`, `editMessageSchema`, `reactionSchema`, `createServerSchema`, `updateServerSchema`, `transferOwnershipSchema`, `addToneSchema`, `updateInviteSettingsSchema`, `createChannelSchema`, `updateChannelSchema`
- **socketRateLimiter.ts** — `createSocketRateLimiter(windowMs, limit): (userId) => boolean` — in-memory per-user fixed-window rate limiter for socket handlers; `true` = allowed, `false` = rate-limited; create once at module level so the Map is shared across all socket connections
- **rateLimiters.test.ts** — unit tests for rateLimiters
- **validate.test.ts** — unit tests for validateBody middleware and all schemas
- **socketRateLimiter.test.ts** — unit tests for createSocketRateLimiter
- **logger.ts** — `logger` — `createLogger('server')` from tone-chat-logger; tagged with `{ service: 'server' }`
- **middleware/** — `requireAuth`, `errorHandler` (see middleware/index.md)
