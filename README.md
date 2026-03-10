# Tone

A Discord-style chat app. Create servers, join channels, send messages in real time.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Native Client  (packages/client)                 │
│  Expo 55 + Expo Router v5 + React Native Paper          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + Socket.IO
┌────────────────────▼────────────────────────────────────┐
│  BFF Server  (packages/server)  :4000                   │
│  Express 5 + Socket.IO 4 + JWT auth                     │
└────┬──────────────────┬──────────────────┬──────────────┘
     │ HTTP             │ HTTP             │ HTTP
┌────▼──────┐   ┌───────▼──────┐   ┌──────▼────────────┐
│messaging  │   │  users       │   │  attachments      │
│Service    │   │  Service     │   │  Service          │
│:3001      │   │  :3002       │   │  :3003            │
│           │   │              │   │                   │
│ MongoDB   │   │  PostgreSQL  │   │  PostgreSQL       │
│ :27017    │   │  :5432       │   │  :5433            │
└───────────┘   └──────────────┘   │  MinIO :9000      │
                                   └───────────────────┘
```

## Packages

| Package              | Port | Database           | Purpose                                              |
|----------------------|------|--------------------|------------------------------------------------------|
| `tone-chat-client`   | ---— | -----------------— | React Native app (iOS, Android, Web)                 |
| `tone-chat-server`   | 4000 | -----------------— | BFF — routes all client requests to backend services |
| `messagingservice`   | 3001 | MongoDB            | Servers, channels, messages, members, invites        |
| `usersservice`       | 3002 | PostgreSQL         | Global user accounts, auth, token lifecycle          |
| `attachmentsservice` | 3003 | PostgreSQL + MinIO | File uploads and attachment metadata                 |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Docker (for messagingService dev environment)

### Install

```bash
pnpm install
```

## Running Services

### BFF Server

```bash
pnpm --filter tone-chat-server dev
```

### messagingService (includes MongoDB via Docker)

```bash
cd packages/messagingService
docker-compose up
```

Or run the service standalone (requires MongoDB already running):

```bash
pnpm --filter messagingservice dev
```

### usersService

```bash
pnpm --filter usersservice migrate   # first time only
pnpm --filter usersservice dev
```

### attachmentsService

```bash
pnpm --filter attachmentsservice migrate   # first time only
pnpm --filter attachmentsservice dev
```

### Client

```bash
pnpm --filter tone-chat-client web       # Web
pnpm --filter tone-chat-client android   # Android
pnpm --filter tone-chat-client ios       # iOS
```

## Running Tests

```bash
# All packages
pnpm test

# Per package
pnpm --filter tone-chat-server test
pnpm --filter messagingservice test
pnpm --filter usersservice test
pnpm --filter attachmentsservice test
pnpm --filter tone-chat-client test
```

### Client E2E (Playwright)

```bash
# First time: install Chromium
pnpm --filter tone-chat-client exec playwright install chromium

# Run all E2E tests
pnpm --filter tone-chat-client test:e2e
```

## Type Checking

```bash
# All backend packages
pnpm typecheck

# Client
pnpm --filter tone-chat-client typecheck
```

## Tech Summary

- **Monorepo**: Lerna + pnpm workspaces
- **Node**: 22+ required (uses native `fetch`, `--experimental-strip-types`)
- **TypeScript**: strict across all packages; backend uses `nodenext` module resolution with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`; client extends `expo/tsconfig.base`
- **Services communicate via HTTP** using native `fetch()` — no extra HTTP client library
- **Auth**: JWT access tokens (15 min) + rotating refresh tokens (7 days); BFF verifies tokens locally before forwarding requests
