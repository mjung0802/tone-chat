# dms/

BFF direct messaging — HTTP route proxy + Socket.IO handlers → messagingService.

- **dms.client.ts** — `getOrCreateConversation()`, `getConversation()`, `listConversations()`, `listDmMessages()`, `sendDmMessage()`, `updateDmMessage()`, `reactToDmMessage()` — HTTP client calls to messagingService DM endpoints
- **dms.broadcast.ts** — `broadcastDmAndNotify()` — emits `dm:new_message` to conversation room and `dm:notification` to recipient's user room (with sender name lookup); shared by routes and socket handlers
- **dms.routes.ts** — BFF HTTP proxy routes with rate limiting + bidirectional block enforcement; delegates broadcast/notification to `dms.broadcast.ts`
- **dms.socket.ts** — Socket.IO handlers: `join_dm`, `leave_dm`, `dm:send`, `dm:typing`, `dm:react`; emits `dm:typing`, `dm:reaction_updated` to DM room participants; enforces block checks; delegates message broadcast/notification to `dms.broadcast.ts`
- **dms.routes.test.ts** / **dms.socket.test.ts** — unit tests
