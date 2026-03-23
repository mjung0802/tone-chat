# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Index System

An index system exists throughout this repo to minimize token usage when navigating. **Always consult the index before reading source files.**

- Each package root has an `index.md` (e.g. `packages/server/index.md`) — start here for a service overview and directory map
- Each `src/` subdirectory has an `index.md` summarizing every file's exports and purpose
- Navigation pattern: `packages/<service>/index.md` → `src/<directory>/index.md` → open only the specific file you need

## Package Manager & Monorepo

This is a **Lerna monorepo** using **pnpm** as the package manager. Always use `pnpm` (not npm or yarn).

```bash
# Install all dependencies across packages
pnpm install

# Run a command in a specific package
pnpm --filter tone-chat-server <script>
pnpm --filter messagingservice <script>
pnpm --filter tone-chat-client <script>
```

### Running Tests

All backend packages use Node.js built-in `node:test` with `--experimental-strip-types`. Unit tests are colocated as `src/**/*.test.ts`, integration tests as `src/**/*.integration.test.ts`. Unit test scripts use extglob `!(*.integration).test.ts` to exclude integration files.

```bash
# Unit tests (per-package or all)
pnpm --filter usersservice test
pnpm --filter messagingservice test
pnpm --filter tone-chat-server test
pnpm --filter attachmentsservice test
pnpm test

# Integration tests — always use the one-command form so migrations run first
pnpm test:integration:up
```

### Integration Test Pattern

Integration tests hit real databases via Docker (`docker-compose.test.yml` — isolated ports, tmpfs). Each test file imports the real `app`, listens on an ephemeral port, and uses `beforeEach` to truncate/clear data. Env vars loaded via `--env-file=.env.test`. All requests need `x-internal-key: dev-internal-key` header; user identity via `x-user-id`.

- **File naming**: `*.integration.test.ts` (must have a prefix before `.integration`, e.g. `auth.integration.test.ts`, NOT `integration.test.ts`)
- **Test containers**: MongoDB:27018, PG(users):5442, PG(attachments):5443, MinIO:9002
- PG services run migrations before tests: `tsx --env-file=.env.test src/db/migrate.ts`

### Test Mocking Pattern

Tests use `mock.module()` (synchronous) for module mocking, followed by `await import()` for the module under test. The `mock.module()` call must come **before** the dynamic import so the mock is registered first.

```ts
// mock.module() is synchronous — no await
mock.module('./dep.js', { namedExports: { fn: mockFn } });

// import is async — await required
const { handler } = await import('./module-under-test.js');
```

A global `AnyFn` type is declared in `test-types.d.ts` for use with `mock.fn<AnyFn>()`.

### Client (packages/client)
```bash
pnpm --filter tone-chat-client start --web   # Start Expo dev server (web)
pnpm --filter tone-chat-client typecheck      # tsc --noEmit
pnpm --filter tone-chat-client test           # Jest
pnpm --filter tone-chat-client test:e2e       # Playwright E2E tests (starts Metro on :19081)
pnpm --filter tone-chat-client test:e2e:ui    # Playwright UI mode (interactive debugging)
```

First time only — install the Chromium browser:
```bash
pnpm --filter tone-chat-client exec playwright install chromium
```

## Feature Planning & Testing Coverage

Whenever planning a new feature or improvement, always audit for testing gaps across all three layers before implementation:

- **Unit tests**: Does the new logic (service functions, helpers, type guards, middleware) have unit tests? Are edge cases and error paths covered?
- **Integration tests**: Are new routes or service interactions covered by integration tests hitting real databases/services? Does any new DB migration need an integration test?
- **E2E tests** (`packages/client`): Are user-facing flows that changed covered by Playwright E2E tests? Are new screens, interactions, or UI states tested end-to-end?

If any layer is missing coverage for the feature, flag it and plan the missing tests as part of the implementation work — not as an afterthought.

## Architecture

**Pattern**: Microservices with a Backend-For-Frontend (BFF). All backend packages are TypeScript with strict config (shared `tsconfig.base.json` at repo root). Services communicate via HTTP using native `fetch()`.

```
React Native Client (packages/client)
        ↓ WebSocket + HTTP
BFF Server (packages/server)              :4000   Express 5 + Socket.IO 4
        ↓ HTTP (fetch)
  ┌─────────────────────────────────────────────────────────────┐
  │  messagingService :3001  │  usersService :3002  │  attachmentsService :3003  │
  │  MongoDB :27017          │  PostgreSQL :5432     │  MinIO (S3) :9000          │
  └─────────────────────────────────────────────────────────────┘
```

- **client** (`packages/client`): React Native (Expo 55 + Expo Router v5) app targeting web, iOS, and Android. Connects to the BFF via HTTP and Socket.IO.
- **server** (`packages/server`): BFF — JWT auth, routes all client requests to backend services, manages all Socket.IO connections (room-based channels). The only service exposed to clients.
- **messagingService** (`packages/messagingService`): MongoDB (Mongoose). Manages servers, channels, messages, and server-scoped members. Collections: `servers`, `channels`, `messages`, `serverMembers` (fields: `role: 'admin'|'mod'|'member'`, `mutedUntil: Date|null`), `serverBans`.
- **usersService** (`packages/usersService`): PostgreSQL (postgres.js). Global user accounts, auth (bcrypt + JWT), token refresh/rotation. Tables: `users`, `refresh_tokens`.
- **attachmentsService** (`packages/attachmentsService`): MinIO for file storage (S3-compatible, swappable to AWS S3). PostgreSQL for metadata. Async uploads so attachments don't block messages. `GET /attachments/:id` regenerates a presigned URL (15min TTL) on each request for `ready` attachments.

### Auth Flow
- JWT access tokens (15 min) + refresh tokens (7 day, rotated). BFF verifies JWTs locally.
- BFF passes `X-User-Id` + `X-Internal-Key` headers to backend services (not internet-exposed).
- Socket.IO auth via JWT in handshake `auth` field.

### Email Verification
- Registration sends a 6-digit OTP to the user's email. Users must verify before full access.
- **Dev mode** (no `SMTP_HOST`): OTP is logged to the usersService console instead of emailed.
- **Local email testing**: `docker compose up` starts Mailpit (SMTP on `:1025`, web UI on `:8025`). Set `SMTP_HOST=localhost` and `SMTP_PORT=1025` in `packages/usersService/.env` to route emails to Mailpit. View caught emails at `http://localhost:8025`.

### Socket.IO Event Payloads
- The `new_message` event payload is the full messagingService JSON response: `{ message: { content, authorId, ... } }` (wrapped in `message` key), not the message object directly. This is because `messages.socket.ts` emits `result.data` from `serviceRequest`, which includes the response wrapper.
- Rooms: channel rooms (`server:<serverId>:channel:<channelId>`) for messages, user-level rooms (`user:<userId>`) for targeted notifications like mentions.

### Message Attachments
- Messages require **either `content` or `attachmentIds`** (or both). Empty messages return 400 (`MISSING_FIELDS`).
- `attachmentIds` is a `string[]` on the message model (MongoDB, default `[]`). The messagingService stores IDs only — actual files live in attachmentsService.
- Socket.IO `send_message` type guard (`isValidSendMessage`) accepts optional `attachmentIds` (max 6 items) but still requires `content` (1–4000 chars). HTTP controller is more lenient (content optional when attachments present).

### Mentions & Replies
- Message model has `replyTo` (embedded object with `messageId`, `content`, `authorId`, `authorName`) and `mentions` (`string[]` of user IDs).
- `send_message` socket event and HTTP POST both accept `replyToId` and `mentions`. Replying auto-adds the original author to mentions.
- Mentions validated: max 20 items, each ≤36 chars, must be server members, sender excluded.
- BFF emits a `mention` event to user-level socket rooms (`user:{userId}`) for each mentioned user.

### API Routes (BFF)
All routes prefixed `/api/v1`. Auth routes → usersService. Server/channel/message/member routes → messagingService. Attachment routes → attachmentsService.

### Role Hierarchy & Moderation
- Four-tier hierarchy: `member` (0) → `mod` (1) → `admin` (2) → `owner` (3, implicit via `server.ownerId`).
- Role utilities: `getRoleLevel()` and `isAbove()` in `packages/messagingService/src/shared/roles.ts` (backend) / `packages/client/src/utils/roles.ts` (client).
- Moderation routes (messagingService, all under `/servers/:serverId/members/:userId`):
  - `POST /mute` / `DELETE /mute` — requires mod+; durations: 60/1440/10080 min
  - `POST /promote` / `POST /demote` — member↔mod requires admin+; mod↔admin requires owner only
  - `DELETE /:userId` (kick) — requires mod+ **and** actor above target in hierarchy
  - `POST /ban` — requires mod+ and above target; creates `ServerBan` record and removes member
  - `GET /bans` / `DELETE /bans/:userId` — requires admin+
- Mute enforcement: `send_message` socket event checks `mutedUntil > now()` and returns `MUTED` error.
- Ban enforcement: `joinServer` checks `ServerBan` before allowing a user to join.
- Client: `getAvailableActions()` in `packages/client/src/utils/roles.ts` determines which action buttons render for a given actor/target pair.

## TypeScript

All backend packages use strict TypeScript with `nodenext` module resolution, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`, extended from root `tsconfig.base.json`. All packages use ESM (`"type": "module"`).

### Type Safety Rules

- **Never use `as unknown as T`** — this is an unsafe double-cast that bypasses the type system entirely. Find the correct type or fix the underlying type mismatch instead.
- **Don't `await` synchronous functions** — e.g., `mock.module()` from `node:test` returns a `MockModuleContext` (not a Promise). Only `await` expressions that actually return a Promise (like `await import(...)`).
- For Express 5 `req.params` values (`string | string[]`), use `as string` (single assertion, not a double-cast).
- For `exactOptionalPropertyTypes`, use `null` instead of `undefined` where the target type doesn't include `undefined` (e.g., `fetch` body).

## Client Architecture (packages/client)

**Stack**: Expo 55, Expo Router v4, React Native Paper v5 (MD3), TanStack Query v5, Zustand v5, socket.io-client v4.

**Structure**:
- `app/` — Expo Router file-based screens: `(auth)/` (login, register), `(main)/` (drawer with servers, channels, profile, invites)
- `src/api/` — `client.ts` (fetch wrapper with auto-auth, 401→refresh→retry) + domain modules (`auth`, `users`, `servers`, `channels`, `messages`, `members`, `invites`, `attachments`)
- `src/stores/` — Zustand: `authStore` (JWT + SecureStore persistence), `socketStore` (Socket.IO lifecycle), `uiStore` (theme, sidebar), `notificationStore` (mention notifications, channel-aware suppression)
- `src/hooks/` — TanStack Query hooks per domain. `useMessages` uses `useInfiniteQuery` (cursor pagination). `useSocket` manages room join/leave and injects `new_message` events into query cache.
- `src/components/` — `chat/`, `servers/`, `channels/`, `members/`, `invites/`, `common/`
- `src/theme/` — WCAG 2.1 AA color palette (4.5:1 contrast), light/dark, min 16px body text
- `src/types/` — `models.ts`, `api.types.ts`, `socket.types.ts`

**Client TypeScript**: Extends `expo/tsconfig.base` (NOT root `tsconfig.base.json`). Uses `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` but NOT `verbatimModuleSyntax` (incompatible with RN bundler). For `exactOptionalPropertyTypes` in component props, always use `prop?: Type | undefined` pattern.

## Key Design Decisions

- **HTTP between services**: Keeps services independently deployable/scalable. Native `fetch()` (Node 22+), no extra HTTP client library needed.
- **Why separate usersService from messagingService**: messagingService stores server-scoped user data (admin status, per-server settings); usersService stores global identity/accounts.
- **Why separate attachmentsService**: Async processing and cross-server resource sharing — attachments don't belong to one server.
- **MinIO for attachments**: Self-hosted S3-compatible storage. Uses `@aws-sdk/client-s3` so migration to real AWS S3 requires zero code changes.
- Node.js 22+ is required (`"engines": {"node": ">=22.0.0"}`).

## Security

Follow these rules for ongoing development:

- **Access control**: Every new route in messagingService must use `requireMember` (for read access) or `requireRole(minimumRole)` (for privileged actions) from `src/shared/middleware/`. `requireRole` chains `requireMember` internally and also sets `req.member` and `req.server`. No route should be accessible without membership verification. Always validate actor is above target with `isAbove()` before applying moderation actions.
- **SQL safety**: Never use `sql.unsafe()`. Use postgres.js tagged templates (`sql\`...\``) for queries and `sql(obj, ...columns)` for dynamic updates. Allowlist updateable fields explicitly.
- **NoSQL safety**: Always validate query parameter types (e.g., confirm a value is a `string`, not an object) before passing them into MongoDB filters.
- **Input validation**: Validate all Socket.IO event payloads with type guards before processing. Use multer `fileFilter` for upload MIME-type restrictions. Sanitize filenames with `path.basename` and strip control characters.
- **Config & secrets**: All secrets have dev defaults — `validateConfig()` in each service blocks production startup if they're unchanged. When adding a new secret, add it to the service's `validateConfig()`.
- **CORS**: Controlled via the `ALLOWED_ORIGINS` env var (comma-separated). Never revert to `origin: '*'` or `origin: true`.
- **Rate limiting**: Auth endpoints use `express-rate-limit` (`packages/server/src/auth/auth.rateLimit.ts`). New public-facing endpoints should get rate limiters too.
- **Data exposure**: `getUser()` strips `email` before returning. Any new PII field must follow the same strip-before-return pattern.

## Shell Commands

- **Avoid compound commands**: Run each shell command separately rather than chaining with `&&` or `;`. Compound commands require a single approval for multiple operations, which triggers more user prompts than necessary for commands that already have permission to run individually.
