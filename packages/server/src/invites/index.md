# invites/

- **invites.client.ts** — `createInvite()`, `listInvites()`, `revokeInvite()`, `joinViaInvite()`, `getDefaultInvite()`, `getInviteStatus(userToken, code)` — proxies invite management to messagingService
- **invites.routes.ts** — `serverInvitesRouter`, `joinRouter` — server-scoped invite CRUD; `joinRouter` has `GET /:code/status` and `POST /:code/join`
