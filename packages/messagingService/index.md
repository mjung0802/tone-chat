# packages/messagingService — Messaging Microservice

Express service on :3001 + MongoDB. Manages servers, channels, messages, members, invites, reactions, and bans. All routes require `X-Internal-Key` header.

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `config/` | MongoDB config + connection |
| `db/` | One-time migration scripts |
| `servers/` | Server CRUD + custom tone management |
| `channels/` | Channel CRUD |
| `messages/` | Message CRUD + reactions; mute enforcement |
| `members/` | Member join/list/moderation with role hierarchy |
| `invites/` | Invite creation + join-via-code flow |
| `bans/` | Ban enforcement + ServerBan records |
| `dms/` | Direct conversation + direct message models |
| `shared/` | Role utilities + `requireMember`/`requireRole` middleware |

## Key Files
- `src/app.ts` — Express app; internalAuth on all routes
- `src/shared/roles.ts` — `getRoleLevel()`, `isAbove()` — import for all hierarchy checks
- `src/shared/middleware/requireMember.ts` — every protected route uses this
- `src/messages/message.model.ts` — full message schema (tone, reactions, mentions, replyTo)
- `src/servers/server.model.ts` — server schema including customTones array

## Integration Tests
- `messaging.integration.test.ts` — full HTTP integration tests
