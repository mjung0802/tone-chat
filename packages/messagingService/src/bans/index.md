# bans/

- **serverBan.model.ts** — `IServerBan` interface, `ServerBan` Mongoose model — fields: serverId, userId, reason, bannedBy, bannedAt; unique index on serverId+userId
- **bans.controller.ts** — `banMember()`, `unbanUser()`, `listBans()` — enforces role hierarchy; removes member on ban
- **bans.routes.ts** — `bansRouter` — GET/DELETE require admin role
- **bans.controller.test.ts** — unit tests for ban controller
