# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Development Commands

### messagingService (the only package with a dev script)
```bash
cd packages/messagingService
pnpm dev   # Runs: node --env-file=.env --watch -r ts-node/register src/index.ts
```

### Running Tests
```bash
# Individual packages
cd packages/server && node ./__tests__/server.test.js
cd packages/client && node ./__tests__/client.test.js
```

### Docker (messagingService)
```bash
cd packages/messagingService
docker-compose up   # Starts MongoDB on port 27017 and messaging service on port 3000
```

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

- **client** (`packages/client`): React Native app (web + mobile), connects to the BFF
- **server** (`packages/server`): BFF — JWT auth, routes all client requests to backend services, manages all Socket.IO connections (room-based channels). The only service exposed to clients.
- **messagingService** (`packages/messagingService`): MongoDB (Mongoose). Manages servers, channels, messages, and server-scoped members. Collections: `servers`, `channels`, `messages`, `serverMembers`.
- **usersService** (`packages/usersService`): PostgreSQL (postgres.js). Global user accounts, auth (bcrypt + JWT), token refresh/rotation. Tables: `users`, `refresh_tokens`.
- **attachmentsService** (`packages/attachmentsService`): MinIO for file storage (S3-compatible, swappable to AWS S3). PostgreSQL for metadata. Async uploads so attachments don't block messages.

### Auth Flow
- JWT access tokens (15 min) + refresh tokens (7 day, rotated). BFF verifies JWTs locally.
- BFF passes `X-User-Id` + `X-Internal-Key` headers to backend services (not internet-exposed).
- Socket.IO auth via JWT in handshake `auth` field.

### API Routes (BFF)
All routes prefixed `/api/v1`. Auth routes → usersService. Server/channel/message/member routes → messagingService. Attachment routes → attachmentsService.

## TypeScript

All backend packages use strict TypeScript with `nodenext` module resolution, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`, extended from root `tsconfig.base.json`. All packages use ESM (`"type": "module"`).

## Key Design Decisions

- **HTTP between services**: Keeps services independently deployable/scalable. Native `fetch()` (Node 22+), no extra HTTP client library needed.
- **Why separate usersService from messagingService**: messagingService stores server-scoped user data (admin status, per-server settings); usersService stores global identity/accounts.
- **Why separate attachmentsService**: Async processing and cross-server resource sharing — attachments don't belong to one server.
- **MinIO for attachments**: Self-hosted S3-compatible storage. Uses `@aws-sdk/client-s3` so migration to real AWS S3 requires zero code changes.
- Node.js 22+ is required (`"engines": {"node": ">=22.0.0"}`).
