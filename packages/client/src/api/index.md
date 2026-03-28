# api/

- **client.ts** — `get()`, `post()`, `patch()`, `put()`, `del()`, `uploadRaw()`, `configureAuth()` — fetch wrapper: auto-injects JWT, 401→refresh→retry, single in-flight refresh deduplication. Base URL: `http://localhost:4000/api/v1`
- **errors.ts** — `getAuthErrorMessage()` — maps API error codes/status to user-friendly text
- **auth.api.ts** — `register()`, `login()`, `refresh()`, `verifyEmail()`, `resendVerification()`
- **messages.api.ts** — `getMessages()` (cursor pagination), `sendMessage()`, `updateMessage()`, `toggleReaction()`
- **servers.api.ts** — `getServers()`, `getServer()`, `createServer()`, `updateServer()`, `deleteServer()`, `transferOwnership()`
- **channels.api.ts** — `getChannels()`, `getChannel()`, `createChannel()`, `updateChannel()`, `deleteChannel()`
- **members.api.ts** — `getMembers()`, `getMember()`, `joinServer()`, `updateMember()`, `removeMember()`, `muteMember()`, `unmuteMember()`, `promoteMember()`, `demoteMember()`, `banMember()`
- **attachments.api.ts** — `uploadAttachment()` (filename in query param), `getAttachment()`
- **auditLog.api.ts** — `getAuditLog()` (cursor pagination)
- **bans.api.ts** — `getBans()`, `unbanUser()`
- **invites.api.ts** — `getInvites()`, `createInvite()`, `revokeInvite()`, `joinViaCode()`
- **users.api.ts** — `getMe()`, `updateMe()`, `getUser()`
- **tones.api.ts** — `getCustomTones()`, `addCustomTone()`, `removeCustomTone()`
- **dms.api.ts** — `getOrCreateConversation()`, `listConversations()`, `getConversation()`, `getDmMessages()` (cursor pagination), `sendDmMessage()`, `updateDmMessage()`, `reactToDmMessage()`; `getBlockedIds()`, `blockUser()`, `unblockUser()`
- **friends.api.ts** — `getFriends()`, `getPendingRequests()`, `getFriendshipStatus(userId)`, `sendFriendRequest(userId)`, `acceptFriendRequest(userId)`, `removeFriend(userId)`
- **client.test.ts** — unit tests for fetch client
