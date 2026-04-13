# packages/logger — Shared Pino Logger

Shared pino logger for all backend services. Dev: colorized pretty-print at debug level. Prod: structured JSON at info level. All log entries tagged with `service` name.

## Exports
- `createLogger(serviceName)` — returns a `pino.Logger` child tagged with `{ service: serviceName }`; reads `NODE_ENV` to switch pretty/JSON output automatically
- `httpLogger(logger)` — returns Express middleware (`pino-http`) for automatic request/response logging; mount near top of middleware stack in `app.ts`

## Usage Pattern
Each service creates `src/shared/logger.ts` that exports a singleton: `export const logger = createLogger('<serviceName>')`. Import `httpLogger` directly from `tone-chat-logger` in `app.ts`.

## Tests
- `index.test.ts` — unit tests for createLogger and httpLogger
