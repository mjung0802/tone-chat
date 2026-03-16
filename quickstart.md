# Quickstart

Get all services running locally from scratch.

## Prerequisites

- **Node.js 22+** — required by all packages
- **pnpm** — `npm install -g pnpm`
- **Docker** — used to run all four databases

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start databases

The root `docker-compose.yml` starts all four databases in one command. Run this from the repo root (preferred over the per-package compose files):

```bash
docker-compose up -d
```

| Service                         | Port                       |
| ------------------------------- | -------------------------- |
| MongoDB (messagingService)      | 27017                      |
| PostgreSQL (usersService)       | 5432                       |
| PostgreSQL (attachmentsService) | 5433                       |
| MinIO (attachmentsService)      | 9000 (API), 9001 (console) |

## 3. Run migrations

usersService and attachmentsService use PostgreSQL and need migrations before starting. messagingService uses Mongoose and has no migration step.

Migrations connect to the Docker-started databases using hardcoded defaults from each service's `config/index.ts` — no `.env` file needed.

```bash
pnpm --filter usersservice migrate
pnpm --filter attachmentsservice migrate
```

## 4. Start backend services

Each command is a long-running process. Open a separate terminal for each.

```bash
# Terminal 1 — messagingService :3001
pnpm --filter messagingservice dev

# Terminal 2 — usersService :3002
pnpm --filter usersservice dev

# Terminal 3 — attachmentsService :3003
pnpm --filter attachmentsservice dev
```

## 5. Start the BFF

Open a new terminal:

```bash
# Terminal 4 — BFF :4000
pnpm --filter tone-chat-server dev
```

The BFF routes all client traffic to the backend services and is the only service the client talks to.

## 6. Start the client

Open a new terminal and choose your target platform:

```bash
# Web
pnpm --filter tone-chat-client web

# Android
pnpm --filter tone-chat-client android

# iOS
pnpm --filter tone-chat-client ios
```

The client connects to the BFF at `http://localhost:4000/api/v1`.

## Port summary

| Service                  | Port  |
| ------------------------ | ----- |
| messagingService         | 3001  |
| usersService             | 3002  |
| attachmentsService       | 3003  |
| BFF (tone-chat-server)   | 4000  |
| MongoDB                  | 27017 |
| PostgreSQL (users)       | 5432  |
| PostgreSQL (attachments) | 5433  |
| MinIO API                | 9000  |
| MinIO console            | 9001  |
