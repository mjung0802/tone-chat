# servers/

- **server.model.ts** — `IServer` interface, `Server` Mongoose model — fields: name, ownerId, icon, description, visibility (public/private), allowMemberInvites (Boolean, default `true`), customTones array (key, label, emoji, colorLight, colorDark, textStyle [default 'normal'], char?, emojiSet?, matchEmojis?)
- **servers.controller.ts** — `createServer()`, `getServer()`, `listServers()`, `updateServer()`, `transferOwnership()`, `deleteServer()`, `updateInviteSettings()` — auto-creates #general channel + owner as admin on create; transfer requires new owner to be admin; `updateInviteSettings` requires admin (via route middleware)
- **servers.routes.ts** — `serversRouter` — POST/GET have no special middleware; PATCH/DELETE require owner; `PATCH /:serverId/invite-settings` requires admin; custom tone routes mounted here
- **customTones.types.ts** — `CustomToneEntry` interface; validation constants `VALID_TEXT_STYLES`, `VALID_CHARS`; re-exports `ToneTextStyle`, `CharAnimation` types
- **customTones.controller.ts** — `listCustomTones()`, `addCustomTone()`, `removeCustomTone()` — key validation `/^[a-z0-9]{1,10}$/`; hex color validation; max 20 tones per server; emojiSet validated as string array (1–8 items); matchEmojis validated as string array (0–20 items)
- **servers.controller.test.ts** / **customTones.controller.test.ts** — unit tests
- **customTones.integration.test.ts** — integration tests for animation field round-trips (add/list/remove with char, emojiSet, matchEmojis)
