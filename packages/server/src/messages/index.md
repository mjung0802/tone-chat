# messages/

- **mentions.helper.ts** — `emitMentionsFromResult()`, `emitMentionEvents()` — emits Socket.IO `mention` events to user-level rooms (`user:{userId}`)
- **messages.client.ts** — `createMessage()`, `listMessages()`, `updateMessage()`, `deleteMessage()`, `toggleReaction()` — proxies message operations to messagingService
- **messages.routes.ts** — `messagesRouter`, `setIO()` — HTTP routes; emits `new_message`+`mention` on POST, `message_edited` on PATCH, `message_deleted` on DELETE; all to channel room `server:{sid}:channel:{cid}`
- **messages.socket.ts** — `registerMessageHandlers()` — Socket.IO handlers: `send_message` (validates content 1–4000 chars, max 6 attachments, max 20 mentions), `typing`, `toggle_reaction`
- **mentions.helper.test.ts** — unit tests for mention helper
- **messages.socket.test.ts** — unit tests for socket message handlers
