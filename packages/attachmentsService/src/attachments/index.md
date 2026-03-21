# attachments/

- **attachments.service.ts** — `createAttachment()` (validates 25MB limit, sanitizes filename, inserts as `processing`, uploads to S3, updates to `ready` with presigned URL), `getAttachment()` (regenerates presigned URL on every fetch for `ready` attachments)
- **storage.service.ts** — `uploadToS3()` (UUID filename with extension, Content-Type), `getPresignedUrl()` (900s/15min TTL)
- **upload.middleware.ts** — `upload` multer config: memory storage, 25MB limit, MIME allowlist (images, mp4/webm, mp3/ogg, pdf, text/plain)
- **attachments.controller.ts** — `uploadFile()` (extracts userId from header, returns 201), `getFile()`
- **attachments.routes.ts** — `attachmentsRouter` — POST `/upload` (multer middleware), GET `/:attachmentId`
- **attachments.service.test.ts** / **storage.service.test.ts** — unit tests
- **attachments.integration.test.ts** — integration tests
