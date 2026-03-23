# dms/

BFF direct messaging — HTTP route proxy + Socket.IO handlers → messagingService.

- **dms.client.ts** — `getOrCreateConversation()`, `getConversation()`, `listConversations()`, `listDmMessages()`, `sendDmMessage()`, `updateDmMessage()`, `reactToDmMessage()` — HTTP client calls to messagingService DM endpoints
- **dms.routes.ts** — BFF HTTP proxy routes with rate limiting + bidirectional block enforcement (checks both directions via usersService before allowing sends)
- **dms.socket.ts** — Socket.IO handlers: `join_dm`, `leave_dm`, `dm:send`, `dm:typing`, `dm:react`; emits `dm:new_message`, `dm:typing`, `dm:reaction_updated`, `dm:notification` to DM room participants; enforces block checks
- **dms.routes.test.ts** / **dms.socket.test.ts** — unit tests
