# invites/

- **invites.client.ts** — `createInvite()`, `listInvites()`, `revokeInvite()`, `joinViaInvite()` — proxies invite management to messagingService
- **invites.routes.ts** — `serverInvitesRouter`, `joinRouter` — server-scoped invite CRUD; separate top-level POST `/:code/join`
