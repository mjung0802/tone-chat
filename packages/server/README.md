# tone-chat-server

Backend-For-Frontend (BFF) for Tone. All client traffic flows through here — backend services are not internet-exposed.

## Stack

- **Express 5** — HTTP routing
- **Socket.IO 4** — real-time messaging
- **jsonwebtoken** — JWT verification
- **TypeScript** (strict, ESM, Node 22+)

## Port

`4000` (configurable via `PORT` env var)

## Auth

- `requireAuth` middleware verifies JWT access tokens on all protected routes
- Decoded `userId` is forwarded to backend services as `X-User-Id`
- A shared `X-Internal-Key` header authenticates server-to-service calls
- Socket.IO: JWT provided in handshake `auth.token` field; connection rejected if missing or invalid

## API Routes

All routes are prefixed `/api/v1`.

### Public

| Method | Path | Forwards to |
|--------|------|-------------|
| POST | `/auth/register` | usersService |
| POST | `/auth/login` | usersService |
| POST | `/auth/refresh` | usersService |

### Protected (require `Authorization: Bearer <token>`)

| Method | Path | Forwards to |
|--------|------|-------------|
| GET / PATCH | `/users/me` | usersService |
| GET | `/users/:id` | usersService |
| GET / POST | `/servers` | messagingService |
| GET / PATCH / DELETE | `/servers/:id` | messagingService |
| GET / POST | `/servers/:sid/channels` | messagingService |
| GET / PATCH / DELETE | `/servers/:sid/channels/:cid` | messagingService |
| GET / POST | `/servers/:sid/channels/:cid/messages` | messagingService |
| PATCH | `/servers/:sid/channels/:cid/messages/:mid` | messagingService |
| GET / POST / DELETE | `/servers/:sid/invites` | messagingService |
| POST | `/invites/:code/join` | messagingService |
| POST / GET / PATCH / DELETE | `/servers/:sid/members` | messagingService |
| GET | `/attachments/public/:token` | attachmentsService (public signed download proxy) |
| POST | `/attachments/upload` | attachmentsService |
| GET | `/attachments/:id` | attachmentsService |
| DELETE | `/attachments/:id` | attachmentsService |

## Socket.IO Events

Room format: `server:<serverId>:channel:<channelId>`

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_channel` | client → server | Join a channel room |
| `leave_channel` | client → server | Leave a channel room |
| `send_message` | client → server | Create and broadcast a message |
| `new_message` | server → room | Broadcast a new message to all room members |
| `typing` | client → server | Emit typing indicator to room |
| `typing` | server → room | Broadcast typing indicator (excludes sender) |

## Scripts

```bash
pnpm dev      # node --env-file=.env --watch --experimental-strip-types src/index.ts
pnpm build    # tsc
pnpm test     # tsx --test --experimental-test-module-mocks "src/**/*.test.ts"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP port |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret for JWT verification |
| `MESSAGING_SERVICE_URL` | `http://localhost:3001` | messagingService base URL |
| `USERS_SERVICE_URL` | `http://localhost:3002` | usersService base URL |
| `ATTACHMENTS_SERVICE_URL` | `http://localhost:3003` | attachmentsService base URL |
| `INTERNAL_API_KEY` | `dev-internal-key` | Shared key for internal service auth |
