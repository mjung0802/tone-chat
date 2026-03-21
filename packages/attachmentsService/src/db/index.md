# db/

- **migrate.ts** — migration runner (same pattern as usersService)
- **migrations/001_create_attachments.sql** — creates `attachments` table (id, user_id, filename, mime_type, size, s3_key, status, presigned_url, timestamps)
