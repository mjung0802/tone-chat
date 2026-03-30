# Tone Chat

A Discord-style chat app — create servers, channels, and send messages in real time. Self-hostable in one command.

## Self-Hosting

### Requirements

- [Docker](https://docs.docker.com/get-docker/) (includes Docker Compose v2)
- `openssl` (pre-installed on macOS/Linux; available via Git Bash on Windows)

### Quick start

```bash
git clone https://github.com/mjung0802/tone-chat.git
cd tone-chat
bash setup.sh
```

The script will:
1. Generate cryptographic secrets
2. Ask for your domain (or use `:80` for local HTTP)
3. Ask for optional SMTP settings (leave blank — OTPs print to console)
4. Write `.env` and run `docker compose -f docker-compose.prod.yml up -d --build`

Once running, open your browser to the configured domain. In the app, enter your server's URL on the connect screen to get started.

### HTTPS / custom domain

When you enter a real domain (e.g. `chat.example.com`) during setup, Caddy automatically obtains and renews a Let's Encrypt TLS certificate. Point your domain's A record to the server's IP before running setup.

### Operations

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down

# Update to latest
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Architecture

```
React Native Client (packages/client)
        | WebSocket + HTTP
BFF Server (packages/server)  :4000   Express 5 + Socket.IO 4 + JWT auth
        | HTTP
  +---------------------+---------------------+--------------------+
  | messagingService    | usersService        | attachmentsService |
  | :3001  MongoDB      | :3002  PostgreSQL   | :3003  PostgreSQL  |
  +---------------------+---------------------+  MinIO :9000       |
                                                +--------------------+
```

| Package              | Port | Database           | Purpose                                              |
|----------------------|------|--------------------|------------------------------------------------------|
| `tone-chat-client`   | —    | —                  | React Native app (iOS, Android, Web via Expo)        |
| `tone-chat-server`   | 4000 | —                  | BFF — routes client requests, manages Socket.IO      |
| `messagingservice`   | 3001 | MongoDB            | Servers, channels, messages, members, invites        |
| `usersservice`       | 3002 | PostgreSQL         | Global user accounts, auth, token lifecycle          |
| `attachmentsservice` | 3003 | PostgreSQL + MinIO | File uploads and attachment metadata                 |

---

## Development

### Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- Docker (for local databases)

### Install

```bash
pnpm install
```

### Start all services

```bash
docker compose up -d        # start MongoDB, PostgreSQL, MinIO, Mailpit
pnpm --filter usersservice migrate
pnpm --filter attachmentsservice migrate
pnpm --filter tone-chat-server dev &
pnpm --filter messagingservice dev &
pnpm --filter usersservice dev &
pnpm --filter attachmentsservice dev &
pnpm --filter tone-chat-client web
```

Email verification OTPs are caught by Mailpit at `http://localhost:8025` in dev mode (set `SMTP_HOST=localhost SMTP_PORT=1025` in `packages/usersService/.env`).

### Running tests

```bash
pnpm test                         # all unit tests
pnpm test:integration:up          # integration tests (needs Docker)
pnpm --filter tone-chat-client test:e2e   # Playwright E2E
```

### Type checking and lint

```bash
pnpm typecheck
pnpm lint
```

---

## Tech stack

- **Monorepo**: Lerna + pnpm workspaces
- **Node**: 22+ (native `fetch`, `--experimental-strip-types`)
- **TypeScript**: strict across all packages
- **Client**: Expo 55, Expo Router v5, React Native Paper, TanStack Query v5, Zustand v5, Socket.IO v4
- **Auth**: JWT access tokens (15 min) + rotating refresh tokens (7 days), per-instance scoping
- **Reverse proxy**: Caddy with automatic HTTPS (Let's Encrypt)
