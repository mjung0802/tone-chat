# users/

- **users.service.ts** — `getUsersByIds()`, `getUserById()`, `updateUser()` — allowlisted update fields: display_name, pronouns, avatar_url, bio, status
- **users.controller.ts** — `getMe()`, `patchMe()`, `getUsersBatch()` (max 100), `getUser()` — strips email before all returns
- **users.routes.ts** — `usersRouter` — GET `/me`, PATCH `/me`, POST `/batch`, GET `/:id`, GET/POST/DELETE `/me/blocks/:userId`, GET `/me/blocks`; friend routes: GET `/me/friends`, GET `/me/friends/pending`, GET `/me/friends/:userId/status`, POST `/me/friends/:userId`, PATCH `/me/friends/:userId/accept`, DELETE `/me/friends/:userId`
- **users.controller.test.ts** / **users.service.test.ts** — unit tests
- **users.integration.test.ts** — integration tests
- **blocks.service.ts** — `blockUser`, `unblockUser`, `getBlockedIds`, `isBlockedBy`
- **blocks.controller.ts** — `postBlock`, `deleteBlock`, `listBlocks`
- **blocks.service.test.ts** — unit tests for blocks service
- **friends.service.ts** — `sendFriendRequest()`, `acceptFriendRequest()`, `declineOrRemoveFriend()`, `getFriends()`, `getPendingRequests()`, `getFriendshipStatus()`; types `FriendEntry`, `FriendRequestEntry`; bidirectional dual-row model
- **friends.controller.ts** — `postFriendRequest`, `patchAcceptRequest`, `deleteFriend`, `listFriends`, `listPendingRequests`, `getFriendshipStatus`
- **friends.service.test.ts** — unit tests for friends service
- **friends.integration.test.ts** — integration tests for friend routes
