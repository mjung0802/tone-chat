# health/

- **health.routes.ts** — `healthRouter` — `GET /` → `{ ok: true, version: "1.0.0" }`. No authentication required. Used by the client connect screen to verify a URL is a Tone deployment.
- **health.test.ts** — unit test invoking the handler directly via Express 5 router stack
- **health.integration.test.ts** — integration test: `GET /api/v1/health` returns 200 without any auth headers
