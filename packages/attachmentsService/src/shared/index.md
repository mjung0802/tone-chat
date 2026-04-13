# shared/

- **logger.ts** — `logger` — `createLogger('attachmentsService')` from tone-chat-logger; tagged with `{ service: 'attachmentsService' }`
- **middleware/** — `internalAuth`, `errorHandler` (see middleware/index.md)
- **types/** — `express.d.ts` — augments `Express.Request` with `userId?: string`
