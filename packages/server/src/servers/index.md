# servers/

- **servers.client.ts** — `createServer()`, `listServers()`, `getServer()`, `updateServer()`, `deleteServer()`, `listCustomTones()`, `addCustomTone()`, `removeCustomTone()`, `transferOwnership()`, `updateInviteSettings()` — proxies all server ops to messagingService
- **servers.routes.ts** — `serversRouter` — full CRUD + custom tone management routes
