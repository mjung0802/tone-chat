# bans/

- **bans.client.ts** — `listBans()`, `unbanUser()` — proxies ban operations to messagingService
- **bans.routes.ts** — `bansRouter` — GET `/` (list bans), DELETE `/:userId` (unban)
