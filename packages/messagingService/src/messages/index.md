# messages/

- **message.model.ts** — `IMessage` interface, `Message` Mongoose model — fields: channelId, serverId, authorId, content, attachmentIds, reactions, replyTo, mentions, tone, editedAt; indexed on channelId+createdAt and mentions
- **messages.controller.ts** — `createMessage()`, `listMessages()`, `updateMessage()` — validates mute status, content/attachment requirement, mentions (max 20), tone (1–50 chars); auto-adds reply author to mentions; returns 403 with `mutedUntil` if muted
- **messages.routes.ts** — `messagesRouter` — all routes require member; cursor pagination via `before` param on list
- **reactions.controller.ts** — `toggleReaction()` — toggles emoji reactions per user; max 10 unique reactions per message
- **messages.controller.test.ts** / **reactions.controller.test.ts** — unit tests
- **reactions.integration.test.ts** — integration tests for reactions
