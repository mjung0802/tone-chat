# attachments/

- **attachments.client.ts** — `uploadAttachment()`, `getAttachment()` — HTTP calls to attachmentsService
- **attachments.routes.ts** — `attachmentsRouter` — POST `/upload`, GET `/:attachmentId`; streams request body as buffer to attachmentsService
