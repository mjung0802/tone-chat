# servers/

- **server.model.ts** — `IServer` interface, `Server` Mongoose model — fields: name, ownerId, icon, description, visibility (public/private), allowMemberInvites (Boolean, default `true`), customTones array (key, label, emoji, colorLight, colorDark, textStyle)
- **servers.controller.ts** — `createServer()`, `getServer()`, `listServers()`, `updateServer()`, `transferOwnership()`, `deleteServer()`, `updateInviteSettings()` — auto-creates #general channel + owner as admin on create; transfer requires new owner to be admin; `updateInviteSettings` requires admin (via route middleware)
- **servers.routes.ts** — `serversRouter` — POST/GET have no special middleware; PATCH/DELETE require owner; `PATCH /:serverId/invite-settings` requires admin; custom tone routes mounted here
- **customTones.controller.ts** — `listCustomTones()`, `addCustomTone()`, `removeCustomTone()` — key validation `/^[a-z0-9]{1,10}$/`; hex color validation; max 20 tones per server
- **servers.controller.test.ts** / **customTones.controller.test.ts** — unit tests
