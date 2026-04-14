# servers/

- **servers.client.ts** — `createServer()`, `listServers()`, `getServer()`, `updateServer()`, `deleteServer()`, `listCustomTones()`, `addCustomTone()`, `removeCustomTone()`, `transferOwnership()`, `updateInviteSettings()` — proxies all server ops to messagingService
- **servers.routes.ts** — `serversRouter` — full CRUD + custom tone management routes; all mutation routes (POST, PATCH) validate request bodies via `validateBody()` using `createServerSchema`, `updateServerSchema`, `transferOwnershipSchema`, `addToneSchema`, `updateInviteSettingsSchema`
