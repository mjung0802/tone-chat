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

**Pattern**: Microservices with a Backend-For-Frontend (BFF)

```
React Native Client (packages/client)
        ↓ WebSocket / HTTP
BFF Server - Express.js + Socket.IO (packages/server)
        ↓ routes to:
  ┌─────────────────────────────────────────────┐
  │  messagingService   │  attachmentsService   │  usersService  │
  │  (servers, msgs,    │  (file uploads,       │  (global user  │
  │   channels, users)  │   async processing)   │   accounts)    │
  └─────────────────────────────────────────────┘
```

- **client** (`packages/client`): React Native app (targets both web and mobile), connects to the BFF server
- **server** (`packages/server`): Express.js 5 + Socket.IO 4 BFF — handles client WebSocket connections and routes to backend services. Currently broadcasts messages to all connected clients.
- **messagingService** (`packages/messagingService`): TypeScript + MongoDB microservice managing server metadata, messages, channels, and server-scoped user data
- **attachmentsService** (`packages/attachmentsService`): Planned — handles file uploads asynchronously so attachments don't block message delivery; attachments are server-agnostic
- **usersService** (`packages/usersService`): Planned — global user accounts so users have one account across multiple servers

## TypeScript (messagingService)

Uses strict TypeScript with `nodenext` module resolution, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All packages use ESM (`"type": "module"`).

## Key Design Decisions

- **Why separate usersService from messagingService**: messagingService stores server-scoped user data (admin status, per-server settings); usersService stores global identity/accounts. Design overlap is a known open question.
- **Why separate attachmentsService**: Async processing and cross-server resource sharing — attachments don't belong to one server.
- Node.js 22+ is required (`"engines": {"node": ">=22.0.0"}`).
