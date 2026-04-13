# users/

- **users.client.ts** — `getMe()`, `patchMe()`, `getUser()`, `getUsersBatch()`, `getFriends()`, `getPendingRequests()`, `getFriendshipStatus()`, `sendFriendRequest()`, `acceptFriendRequest()`, `removeFriend()`, `getBlockedIds()`, `blockUser()`, `unblockUser()`, `isBlockedBidirectional()` — proxies user and friend operations to usersService
- **users.routes.ts** — `usersRouter` — GET `/me`, PATCH `/me`, GET `/:id`; friend routes: GET `/me/friends`, GET `/me/friends/pending`, GET `/me/friends/:userId/status`, POST `/me/friends/:userId` (emits `friend:request_received`), PATCH `/me/friends/:userId/accept` (emits `friend:request_accepted`), DELETE `/me/friends/:userId`; block routes: GET `/me/blocks`, POST `/me/blocks/:userId`, DELETE `/me/blocks/:userId`
- **users.routes.test.ts** — unit tests for usersRouter
