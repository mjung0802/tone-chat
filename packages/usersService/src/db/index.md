# db/

- **migrate.ts** — reads SQL files from migrations/, tracks applied migrations in `_migrations` table, runs sequentially
- **migrations/** — SQL migration files: 001 users, 002 credentials, 003 refresh_tokens, 004 email_verified, 005 email_verification_tokens
