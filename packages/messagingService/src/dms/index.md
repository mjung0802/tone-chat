# dms/

Direct Messaging data models for 1-to-1 conversations.

- **conversation.model.ts** — `IDirectConversation` interface, `DirectConversation` Mongoose model — fields: `participantIds` (sorted pair, unique index), `lastMessageAt`; indexed on `participantIds` (unique) and `participantIds + lastMessageAt` (for listing)
- **directMessage.model.ts** — `IDirectMessage` interface, `DirectMessage` Mongoose model — fields: `conversationId`, `authorId`, `content`, `attachmentIds`, `replyTo`, `mentions`, `reactions`, `tone`, `editedAt`; indexed on `conversationId + createdAt` and `mentions`
