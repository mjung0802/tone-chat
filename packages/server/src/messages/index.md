# messages/

- **mentions.helper.ts** — `emitMentionsFromResult()`, `emitMentionEvents()` — emits Socket.IO `mention` events to user-level rooms (`user:{userId}`)
- **messages.client.ts** — `createMessage()`, `listMessages()`, `updateMessage()`, `toggleReaction()` — proxies message operations to messagingService
- **messages.routes.ts** — `messagesRouter`, `setIO()` — HTTP routes; emits Socket.IO `new_message` and `mention` events on POST
- **messages.socket.ts** — `registerMessageHandlers()` — Socket.IO handlers: `send_message` (validates content 1–4000 chars, max 6 attachments, max 20 mentions), `typing`, `toggle_reaction`
- **mentions.helper.test.ts** — unit tests for mention helper
- **messages.socket.test.ts** — unit tests for socket message handlers
