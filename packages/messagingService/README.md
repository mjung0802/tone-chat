# messagingService

Manages servers, channels, messages, server members, and invites for Tone.

## Stack

- **Express 5** — HTTP routing
- **Mongoose 8** — MongoDB ODM
- **TypeScript** (strict, ESM, Node 22+)

## Port

`3001` (configurable via `PORT` env var)

## Database

MongoDB — default URI: `mongodb://localhost:27017/tone_messaging`

## Collections & Schemas

### `servers`

| Field                     | Type                    | Notes               |
| ------------------------- | ----------------------- | ------------------- |
| `name`                    | String                  | required            |
| `ownerId`                 | String                  | required            |
| `icon`                    | String                  | optional            |
| `description`             | String                  | optional            |
| `visibility`              | `'public' \| 'private'` | default `'private'` |
| `createdAt` / `updatedAt` | Date                    | Mongoose timestamps |

### `channels`

| Field                     | Type                | Notes               |
| ------------------------- | ------------------- | ------------------- |
| `serverId`                | ObjectId → Server   | required            |
| `name`                    | String              | required            |
| `type`                    | `'text' \| 'voice'` | default `'text'`    |
| `topic`                   | String              | optional            |
| `position`                | Number              | default `0`         |
| `createdAt` / `updatedAt` | Date                | Mongoose timestamps |

Index: `{ serverId, position }` for ordered channel lists.

### `messages`

| Field           | Type               | Notes               |
| --------------- | ------------------ | ------------------- |
| `channelId`     | ObjectId → Channel | required            |
| `serverId`      | ObjectId → Server  | required            |
| `authorId`      | String             | required            |
| `content`       | String             | required            |
| `attachmentIds` | String[]           | default `[]`        |
| `editedAt`      | Date               | optional            |
| `createdAt`     | Date               | Mongoose timestamps |

Index: `{ channelId, createdAt: -1 }` for cursor-based pagination via `?before=<messageId>`.

### `serverMembers`

| Field      | Type              | Notes              |
| ---------- | ----------------- | ------------------ |
| `serverId` | ObjectId → Server | required           |
| `userId`   | String            | required           |
| `nickname` | String            | optional           |
| `roles`    | String[]          | default `[]`       |
| `joinedAt` | Date              | default `Date.now` |

Unique index: `{ serverId, userId }`.

### `invites`

| Field                     | Type              | Notes                                              |
| ------------------------- | ----------------- | -------------------------------------------------- |
| `serverId`                | ObjectId → Server | required                                           |
| `code`                    | String            | unique; auto-generated base64url                   |
| `createdBy`               | String            | required                                           |
| `maxUses`                 | Number            | optional                                           |
| `uses`                    | Number            | default `0`                                        |
| `expiresAt`               | Date              | optional; TTL index auto-deletes expired documents |
| `revoked`                 | Boolean           | default `false`                                    |
| `createdAt` / `updatedAt` | Date              | Mongoose timestamps                                |

## Routes

All routes require `X-Internal-Key` and `X-User-Id` headers (set by the BFF).

| Method               | Path                                       | Description                               |
| -------------------- | ------------------------------------------ | ----------------------------------------- |
| GET / POST           | `/servers`                                 | List user's servers / create server       |
| GET / PATCH / DELETE | `/servers/:id`                             | Get / update / delete server              |
| GET / POST           | `/servers/:id/channels`                    | List channels / create channel            |
| GET / PATCH / DELETE | `/servers/:id/channels/:cid`               | Get / update / delete channel             |
| GET / POST           | `/servers/:id/channels/:cid/messages`      | List messages (`?before=`) / send message |
| PATCH                | `/servers/:id/channels/:cid/messages/:mid` | Edit message                              |
| GET / POST / DELETE  | `/servers/:id/members`                     | List / join / remove members              |
| PATCH                | `/servers/:id/members/:uid`                | Update member (nickname, roles)           |
| POST / GET / DELETE  | `/servers/:id/invites`                     | Create / list / revoke invites            |
| POST                 | `/invites/:code/join`                      | Join server via invite code               |

## Auth

Internal auth only — not internet-exposed. The BFF adds:

- `X-Internal-Key` — validated against `INTERNAL_API_KEY` env var
- `X-User-Id` — identifies the acting user

## Docker

```bash
cd packages/messagingService
docker-compose up   # Starts MongoDB on :27017 + service on :3001
```

## Scripts

```bash
pnpm dev      # node --env-file=.env --watch --experimental-strip-types src/index.ts
pnpm build    # tsc
pnpm test     # tsx --test --experimental-test-module-mocks "src/**/*.test.ts"
```

## Environment Variables

| Variable           | Default                                    | Description                  |
| ------------------ | ------------------------------------------ | ---------------------------- |
| `PORT`             | `3001`                                     | HTTP port                    |
| `MONGO_URI`        | `mongodb://localhost:27017/tone_messaging` | MongoDB connection string    |
| `INTERNAL_API_KEY` | `dev-internal-key`                         | Shared key for internal auth |
