# messages/

- **message.model.ts** — `IMessage` interface, `Message` Mongoose model — fields: channelId, serverId, authorId, content, attachmentIds, reactions, replyTo, mentions, tone, editedAt; indexed on channelId+createdAt and mentions
- **messages.controller.ts** — `createMessage()`, `listMessages()`, `updateMessage()`, `deleteMessage()` — validates mute status, content/attachment requirement, mentions (max 20), tone (1–50 chars); auto-adds reply author to mentions; returns 403 with `mutedUntil` if muted; edit/delete enforce author ownership
- **messages.routes.ts** — `messagesRouter` — all routes require member; GET cursor pagination via `before` param; PATCH (edit), DELETE (delete own message)
- **reactions.controller.ts** — `toggleReaction()` — toggles emoji reactions per user; max 10 unique reactions per message
- **messages.controller.test.ts** / **reactions.controller.test.ts** — unit tests
- **messages.integration.test.ts** — integration tests for DELETE route (204 happy path, 403 non-author, 404 not found, non-member)
- **reactions.integration.test.ts** — integration tests for reactions
