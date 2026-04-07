# attachments/

- **attachments.client.ts** — `uploadAttachment()`, `getAttachment()`, `deleteAttachment()`, `getPublicAttachment()` — HTTP calls to attachmentsService
- **attachments.routes.ts** — `attachmentsRouter` (auth) — POST `/upload`, GET `/:attachmentId`, DELETE `/:attachmentId`; `attachmentsPublicRouter` (public) — GET `/public/:token`; streams request body as buffer to attachmentsService
