# packages/attachmentsService — File Storage Service

Express service on :3003 + PostgreSQL (metadata) + MinIO/S3 (file storage). Async uploads so attachments don't block messages. Presigned URLs regenerated on every GET (15-min TTL).

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `config/` | PostgreSQL + S3/MinIO client setup |
| `db/` | Migration runner + attachments table schema |
| `attachments/` | Upload/retrieve logic; multer middleware; S3 operations |
| `shared/` | `internalAuth` + `errorHandler` middleware + pino logger |

## Key Files
- `src/attachments/attachments.service.ts` — core upload + retrieval with S3 presigned URLs
- `src/attachments/storage.service.ts` — `@aws-sdk/client-s3` operations (swap MinIO for S3 with zero code changes)
- `src/attachments/upload.middleware.ts` — MIME allowlist + 25MB size limit enforcement
- `src/shared/logger.ts` — pino logger; `createLogger('attachmentsService')` from tone-chat-logger
- `src/config/storage.ts` — S3Client configuration

## Integration Tests
- `attachments.integration.test.ts`
