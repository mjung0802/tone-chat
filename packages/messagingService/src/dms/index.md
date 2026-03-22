# dms/

Direct Messaging — 1-to-1 conversations and messages.

- **conversation.model.ts** — `IDirectConversation` interface, `DirectConversation` Mongoose model — fields: `participantIds` (sorted pair, unique index), `lastMessageAt`; indexed on `participantIds` (unique) and `participantIds + lastMessageAt` (for listing)
- **directMessage.model.ts** — `IDirectMessage` interface, `DirectMessage` Mongoose model — fields: `conversationId`, `authorId`, `content`, `attachmentIds`, `replyTo`, `mentions`, `reactions`, `tone`, `editedAt`; indexed on `conversationId + createdAt` and `mentions`
- **middleware.ts** — `requireConversationParticipant` — reads `conversationId` from `req.params`, verifies caller is a participant, attaches `req.conversation`; returns 401/404/403 on failure
- **dm.controller.ts** — `getOrCreateConversation`, `getConversation`, `listConversations`, `listDmMessages`, `sendDmMessage`, `editDmMessage`, `toggleDmReaction` — full CRUD for DM conversations and messages
- **dm.routes.ts** — `dmsRouter` — mounts all DM routes; conversation-scoped routes use `requireConversationParticipant`
- **dm.controller.test.ts** — unit tests for all controller functions
- **middleware.test.ts** — unit tests for `requireConversationParticipant`
