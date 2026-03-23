# packages/server — BFF (Backend-For-Frontend)

Express 5 + Socket.IO 4 server on :4000. Verifies JWTs locally, proxies all client requests to backend microservices, manages all Socket.IO connections.

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `config/` | Environment config + production validation |
| `attachments/` | Proxy routes + HTTP client → attachmentsService |
| `auth/` | Auth proxy routes + rate limiting → usersService |
| `bans/` | Ban management proxy → messagingService |
| `channels/` | Channel CRUD proxy → messagingService |
| `dms/` | DM HTTP route proxy + Socket.IO handlers → messagingService |
| `invites/` | Invite management proxy → messagingService |
| `members/` | Member CRUD + moderation proxy → messagingService; enriches with user data |
| `messages/` | Message HTTP routes + Socket.IO handlers; emits `new_message`/`mention` events |
| `servers/` | Server CRUD + custom tones proxy → messagingService |
| `socket/` | Socket.IO setup, JWT auth, room join/leave, message handler registration |
| `users/` | User profile proxy → usersService |
| `shared/` | `serviceRequest()` HTTP utility + auth/error middleware |

## Key Files
- `src/app.ts` — Express app with all routers mounted under `/api/v1`
- `src/index.ts` — HTTP server entrypoint, Socket.IO setup, config validation
- `src/shared/serviceClient.ts` — all inter-service HTTP calls go through this
- `src/messages/messages.socket.ts` — Socket.IO `send_message` handler with full validation
- `src/socket/index.ts` — Socket.IO configuration and room management

## Integration Tests
- `bff.integration.test.ts` — full HTTP integration tests
- `socket.integration.test.ts` — Socket.IO integration tests
