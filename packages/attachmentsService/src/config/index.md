# config/

- **index.ts** — `config` object (port, DATABASE_URL, S3 endpoint/bucket/credentials, internal API key) + `validateConfig()`
- **database.ts** — `sql` postgres.js instance for attachments metadata DB
- **storage.ts** — `s3` S3Client (MinIO endpoint) + `ensureBucket()` creates bucket if missing
