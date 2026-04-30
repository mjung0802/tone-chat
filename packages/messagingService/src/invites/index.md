# invites/

- **invite.model.ts** — `IInvite` interface, `Invite` Mongoose model — fields: serverId, code (auto-generated base64url), createdBy, maxUses, uses, expiresAt, revoked; TTL index on expiresAt
- **invites.controller.ts** — `getDefaultInvite()` (gets-or-creates permanent invite; respects `allowMemberInvites` flag — non-admins blocked if disabled), `createInvite()`, `listInvites()`, `revokeInvite()`, `joinViaInvite()` — validates expiry/maxUses/revoked/ban status on join; `getInviteStatus()` — returns `InviteStatusResponse` with status (`valid`|`revoked`|`expired`|`exhausted`|`not-found`), `alreadyMember`, `banned`, and `serverName`
- **invites.routes.ts** — `invitesRouter`, `joinRouter` — server-scoped routes require admin; `joinRouter` has `GET /:code/status` (unauthenticated) and `POST /:code/join`
- **invites.controller.test.ts** — unit tests for invite controller
