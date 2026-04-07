# attachmentsService

File storage and attachment metadata for Tone. Async by design — uploads don't block message sending. Attachments are cross-server resources, not tied to a specific server.

## Stack

- **Express 5** — HTTP routing
- **@aws-sdk/client-s3** — S3-compatible storage client (MinIO in dev)
- **multer 2** — multipart file parsing
- **postgres.js 3** — PostgreSQL client for metadata
- **TypeScript** (strict, ESM, Node 22+)

## Port

`3003` (configurable via `PORT` env var)

## Storage

MinIO (self-hosted S3-compatible) — default endpoint: `http://localhost:9000`, bucket: `tone-attachments`.

The service uses `@aws-sdk/client-s3`, so migrating to AWS S3 requires only config changes — no code changes.

The S3 bucket is created automatically on startup if it doesn't exist.

Maximum file size: **25 MB**.

Storage backend is configurable:

- `ATTACHMENTS_STORAGE_PROVIDER=s3` (default): MinIO/S3 object storage
- `ATTACHMENTS_STORAGE_PROVIDER=local`: stores files on local disk (`ATTACHMENTS_LOCAL_STORAGE_PATH`)

In local mode, `GET /attachments/:attachmentId` returns a signed URL that points to the BFF public proxy route under `/api/v1/attachments/public/:token`.

## Metadata Database

PostgreSQL — default URL: `postgres://tone:tone_dev@localhost:5433/tone_attachments`

### `attachments` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | primary key |
| `uploader_id` | String | user who uploaded |
| `filename` | String | original filename |
| `mime_type` | String | |
| `size_bytes` | Integer | |
| `storage_key` | String | S3 object key |
| `status` | `'processing' \| 'ready' \| 'failed'` | updated after S3 upload |
| `url` | String | public URL (null until ready) |
| `created_at` | Timestamp | |

Run migrations before first start:

```bash
pnpm migrate
```

## Routes

All routes require `X-Internal-Key` and `X-User-Id` headers set by the BFF.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/attachments/upload?filename=<name>` | Upload raw binary; returns attachment metadata |
| GET | `/attachments/:attachmentId` | Retrieve attachment metadata |
| DELETE | `/attachments/:attachmentId` | Delete attachment (uploader only) |
| GET | `/attachments/public/:token` | Public signed download endpoint for local storage mode |

## Auth

Internal auth only — not internet-exposed. The BFF adds:

- `X-Internal-Key` — validated against `INTERNAL_API_KEY` env var
- `X-User-Id` — identifies the uploader

## Migrations

```bash
pnpm migrate   # node --experimental-strip-types src/db/migrate.ts
```

Runs SQL files in `src/db/migrations/` in alphabetical order, skipping already-applied ones.

## Scripts

```bash
pnpm dev      # node --env-file=.env --watch --experimental-strip-types src/index.ts
pnpm build    # tsc
pnpm test     # tsx --test --experimental-test-module-mocks "src/**/*.test.ts"
pnpm migrate  # Apply database migrations
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3003` | HTTP port |
| `DATABASE_URL` | `postgres://tone:tone_dev@localhost:5433/tone_attachments` | PostgreSQL connection string |
| `INTERNAL_API_KEY` | `dev-internal-key` | Shared key for internal auth |
| `ATTACHMENTS_STORAGE_PROVIDER` | `s3` | Storage backend (`s3` or `local`) |
| `ATTACHMENTS_LOCAL_STORAGE_PATH` | `./storage/attachments` | Local storage directory (used when provider is `local`) |
| `ATTACHMENTS_PUBLIC_BASE_URL` | `http://localhost:4000/api/v1` | Base URL used for generated local signed URLs |
| `ATTACHMENTS_URL_SIGNING_SECRET` | `INTERNAL_API_KEY` | Secret used to sign local download URLs |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 / MinIO endpoint |
| `S3_BUCKET` | `tone-attachments` | Bucket name |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `S3_REGION` | `us-east-1` | S3 region |
