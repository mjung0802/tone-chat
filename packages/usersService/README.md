# usersService

Global user accounts, authentication, and token lifecycle for Tone. Kept server-agnostic to support cross-server identity, global account deletion, and global moderation.

## Stack

- **Express 5** — HTTP routing
- **postgres.js 3** — PostgreSQL client
- **bcrypt 6** — password hashing
- **jsonwebtoken** — JWT issuance and verification
- **TypeScript** (strict, ESM, Node 22+)

## Port

`3002` (configurable via `PORT` env var)

## Database

PostgreSQL — default URL: `postgres://tone:tone_dev@localhost:5432/tone_users`

### Tables

**`users`** — global user accounts

**`refresh_tokens`** — active refresh tokens (rotated on use)

Run migrations before first start:

```bash
pnpm migrate
```

## Token Scheme

- **Access tokens**: JWT, 15-minute expiry (configurable)
- **Refresh tokens**: opaque, 7-day expiry (configurable), rotated on every use

## Routes

All routes require `X-Internal-Key` and (where applicable) `X-User-Id` headers set by the BFF.

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| POST | `/auth/register` | `{ user, accessToken, refreshToken }` | Creates account + issues tokens |
| POST | `/auth/login` | `{ user, accessToken, refreshToken }` | Validates credentials + issues tokens |
| POST | `/auth/refresh` | `{ accessToken, refreshToken }` | Rotates refresh token |
| GET | `/users/me` | `{ user }` | Requires `X-User-Id` |
| PATCH | `/users/me` | `{ user }` | Update profile; requires `X-User-Id` |
| GET | `/users/:id` | `{ user }` | Look up any user by ID |

## Auth Flow Documentation

See [`docs/auth-flows.md`](../../docs/auth-flows.md) for a detailed mockup of all authentication flows including sequence diagrams, request/response shapes, error codes, and token storage notes.

## Auth

Internal auth only — not internet-exposed. The BFF adds:

- `X-Internal-Key` — validated against `INTERNAL_API_KEY` env var
- `X-User-Id` — identifies the acting user (for `/users/me` routes)

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
| `PORT` | `3002` | HTTP port |
| `DATABASE_URL` | `postgres://tone:tone_dev@localhost:5432/tone_users` | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret for signing JWTs |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifespan |
| `JWT_REFRESH_EXPIRES_DAYS` | `7` | Refresh token lifespan in days |
| `INTERNAL_API_KEY` | `dev-internal-key` | Shared key for internal auth |
