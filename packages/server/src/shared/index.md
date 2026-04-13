# shared/

- **serviceClient.ts** — `ServiceResponse` interface, `serviceRequest()` — unified HTTP client for backend services; attaches `X-Internal-Key` and `X-User-Token` headers
- **serviceClient.test.ts** — unit tests for serviceClient
- **rateLimiters.ts** — `mutationLimiters` — per-user rate limiters: `message` (30/min), `serverWrite` (10/10min), `invite` (20/10min), `memberAction` (30/10min)
- **rateLimiters.test.ts** — unit tests for rateLimiters
- **logger.ts** — `logger` — `createLogger('server')` from tone-chat-logger; tagged with `{ service: 'server' }`
- **middleware/** — `requireAuth`, `errorHandler` (see middleware/index.md)
