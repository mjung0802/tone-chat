# shared/

- **serviceClient.ts** — `ServiceResponse` interface, `serviceRequest()` — unified HTTP client for backend services; attaches `X-Internal-Key` and `X-User-Id` headers
- **serviceClient.test.ts** — unit tests for serviceClient
- **middleware/** — `requireAuth`, `errorHandler` (see middleware/index.md)
