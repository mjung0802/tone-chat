# invites/

- **invite.model.ts** — `IInvite` interface, `Invite` Mongoose model — fields: serverId, code (auto-generated base64url), createdBy, maxUses, uses, expiresAt, revoked; TTL index on expiresAt
- **invites.controller.ts** — `createInvite()`, `listInvites()`, `revokeInvite()`, `joinViaInvite()` — validates expiry/maxUses/revoked/ban status on join
- **invites.routes.ts** — `invitesRouter`, `joinRouter` — server-scoped routes require admin; join route has no auth requirement
- **invites.controller.test.ts** — unit tests for invite controller
