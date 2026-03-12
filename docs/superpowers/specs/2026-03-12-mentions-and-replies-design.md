# Mentions (@Ping) and Replies — Design Spec

## Summary

Add @mention (ping) and reply functionality to tone-chat. Mentions notify users via highlighted messages and cross-channel toast notifications. Replies let users respond to specific messages with a visual thread indicator.

## Architecture Approach

- **Mention storage**: Parse-on-send with stored mention userIds on the message document
- **Notification delivery**: User-level Socket.IO rooms (`user:<userId>`) for targeted cross-channel events
- **Reply storage**: Snapshot subdocument on the message (denormalized for resilience to original deletion)

---

## 1. Data Model Changes

### messagingService — Message Model

Add two fields to `IMessage` and the Mongoose schema:

```typescript
// On IMessage interface
replyTo?: {
  messageId: string;
  authorId: string;
  authorName: string;    // Snapshot — display name at time of reply
  content: string;       // Snapshot — first 100 chars of original
};
mentions: string[];      // Resolved userIds of @mentioned users
```

Schema additions:
- `replyTo`: subdocument with `{ messageId: String, authorId: String, authorName: String, content: String }`, `_id: false`, optional
- `mentions`: `[String]`, default `[]`
- Add index: `messageSchema.index({ mentions: 1 })` for future "find messages mentioning me" queries

### Client — Message Type

```typescript
// On Message interface in models.ts
replyTo?: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
mentions?: string[] | undefined;
```

### Socket Types

**Updated SendMessagePayload**:
```typescript
interface SendMessagePayload {
  serverId: string;
  channelId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;      // NEW
  mentions?: string[];      // NEW — resolved userIds
}
```

**New MentionEvent** (server → client):
```typescript
interface MentionEvent {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;        // Who mentioned you
}
```

**Updated ServerToClientEvents**:
```typescript
mention: (event: MentionEvent) => void;
```

**Note on `new_message` payload**: The `new_message` event wraps the message in a `{ message: {...} }` object (documented in CLAUDE.md). The client's `injectMessage` helper already receives the unwrapped `Message` via the socket handler in `useSocket.ts`. The new `replyTo` and `mentions` fields will flow through automatically once added to the `Message` type.

### Out of Scope

- `@everyone` / `@here` group mentions — individual mentions only for now
- Relaxing the socket `send_message` type guard to allow attachment-only messages (existing limitation)
- Reply-to-a-reply shows the direct target's content (standard Discord/Slack behavior), not the root message

---

## 2. Backend Changes

### messagingService

**`messages.controller.ts` — `createMessage`**:
1. Accept `replyToId?: string` and `mentions?: string[]` from request body
2. If `replyToId` is provided:
   - Look up original message with filter `{ _id: replyToId, channelId, serverId }` (scoped to same channel/server to prevent cross-channel content leakage)
   - If not found, return 404 (`REPLY_TARGET_NOT_FOUND`)
   - Build `replyTo` snapshot: `{ messageId, authorId, authorName, content: original.content.slice(0, 100) }`
   - `authorName` is resolved by the messagingService, which owns the `serverMembers` collection. Look up the ServerMember for the original author and use the priority: nickname > display_name > username > userId fallback
   - Auto-add original message's `authorId` to `mentions` (deduped with any explicit mentions)
3. Validate `mentions`: must be array of strings, max 20 items, each string max 36 chars (UUID format). Return 400 (`INVALID_MENTIONS`) on failure.
4. Store both fields on the new message document

**`message.model.ts`**:
- Add `replyTo` (with `authorName`) and `mentions` to schema and interface (see Section 1)
- Add index: `messageSchema.index({ mentions: 1 })`

### BFF (server)

**`socket/index.ts`**:
- On socket `connection`, join `user:<userId>` room: `void socket.join(\`user:${userId}\`)`

**`messages.socket.ts`**:
1. Update `isValidSendMessage` type guard:
   - Accept optional `replyToId` (string, non-empty if present)
   - Accept optional `mentions` (string array, max 20 items)
   - **Note**: The existing type guard requires `content` (1-4000 chars). This is a known limitation — attachment-only replies won't work via the socket path. This matches the current behavior and is out of scope for this feature.
2. In `send_message` handler, after broadcasting `new_message` to channel room:
   - Read `mentions` from the response message data (`result.data.message.mentions`)
   - **Validate each mentioned userId is a member of the server** before emitting (call `getMember` or batch-check). Skip non-members silently.
   - For each validated mentioned userId (excluding the sender):
     - Emit `mention` event to `user:<mentionedUserId>` room with `{ messageId, channelId, serverId, authorId: senderId }`
3. Pass `replyToId` and `mentions` through to `messagesClient.createMessage()` body

**`messages.client.ts`**:
- Pass `replyToId` and `mentions` in the body object to `createMessage`

**New shared helper** — `packages/server/src/messages/mentions.helper.ts`:
```typescript
// Emits mention events to user rooms, validating membership first
export async function emitMentionEvents(
  io: Server,
  senderId: string,
  serverId: string,
  channelId: string,
  messageId: string,
  mentions: string[],
): Promise<void>;
```
- For each userId in `mentions` (excluding sender), verify server membership via `getMember`, then emit `mention` event to `user:<userId>` room
- Used by both the socket handler and the HTTP route handler

**BFF HTTP routes** (`messages.routes.ts` / `messages.controller.ts` in the BFF):
- The HTTP `POST /messages` route currently passes `req.body` through to messagingService. It will continue to do so (replyToId + mentions flow through automatically), but the handler must also read the response, extract the stored `mentions` array, and call `emitMentionEvents()` before returning
- Currently the client's `useSendMessage` hook uses the HTTP API (not socket) for sending messages. Both paths must support the new fields

---

## 3. Client — @Mention Autocomplete

### New Component: `MentionAutocomplete`

Location: `packages/client/src/components/chat/MentionAutocomplete.tsx`

Behavior:
1. Watches message text for `@<partial>` at the cursor position. Uses `onSelectionChange` on the TextInput to track cursor position. Detects the `@` trigger by scanning backwards from cursor to the nearest space or start-of-string.
2. Filters server members by matching `partial` against `username`, `display_name`, and `nickname` (case-insensitive)
3. Renders a scrollable dropdown (max 5 visible items) positioned absolutely above the input
4. Each item shows display name + @username
5. On selection: replaces `@partial` with `@username` in text, adds userId to `pendingMentions` set

Props:
```typescript
interface MentionAutocompleteProps {
  text: string;
  members: ServerMember[];
  onSelect: (member: ServerMember) => void;
}
```

### MessageInput Changes

- New prop: `members?: ServerMember[]`
- New state: `pendingMentions: Set<string>` — tracks resolved userIds from autocomplete
- Updated `onSend` signature: `onSend(content: string, attachmentIds: string[], options?: { replyToId?: string; mentions?: string[] })`
- On send: passes `Array.from(pendingMentions)` as mentions, clears the set
- Renders `<MentionAutocomplete>` when `@` trigger is detected in text
- On autocomplete select: replaces `@partial` with `@username`, adds userId to pendingMentions

---

## 4. Client — Reply UI

### Reply Button on MessageBubble

The hover action area (currently just emoji button) becomes a two-button row:
- **Reply** (`reply` icon, 18px) — calls `onReply(message)` prop
- **React** (`emoticon-outline` icon, 18px) — existing behavior

Both appear on hover (web) and via `onTouchEnd` (mobile). Layout: vertical stack next to the bubble.

New prop on `MessageBubble`:
```typescript
onReply?: ((message: Message) => void) | undefined;
```

### Reply Preview Bar in MessageInput

New component rendered above the input row (between AttachmentPreview and input container):
- Shows: "Replying to **@authorName**" + first ~80 chars + close (X) IconButton
- Pressing X calls `onCancelReply`

New props on `MessageInput`:
```typescript
replyTarget?: {
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
} | undefined;
onCancelReply?: (() => void) | undefined;
```

### Reply Indicator on Sent Messages

In `MessageBubble`, when `message.replyTo` exists, render above message content:
- Reply icon + "**@authorName**" (from `message.replyTo.authorName` snapshot) + truncated original content (lighter, smaller text)
- Fallback if `authorName` is missing: show "Unknown User"
- `Pressable` — triggers `onReplyPress(message.replyTo.messageId)`

New prop on `MessageBubble`:
```typescript
onReplyPress?: ((messageId: string) => void) | undefined;
```

### Mention Highlighting

When `message.mentions` includes `currentUserId`, the bubble gets:
- A 3px left border in `theme.colors.tertiary`
- Subtle background tint using `theme.colors.tertiaryContainer` with low opacity

---

## 5. Scroll-to-Message

### ChannelScreen Orchestration

New state: `highlightMessageId: string | null`

When reply indicator is pressed:
1. `MessageList` receives a `scrollToMessageId` prop and exposes the FlatList via `ref`
2. Find the target message index in the messages array
3. Call `scrollToIndex({ index, animated: true })`
4. Set `highlightMessageId` briefly (clear after ~1.5s)
5. `MessageBubble` receives `highlighted` prop — applies a brief flash/pulse background

If the target message isn't in the loaded data, show a Snackbar: "Original message not loaded"

### MessageList Changes

- New props: `scrollToMessageId`, `highlightedMessageId`, `onReply`, `onReplyPress`
- Use `React.forwardRef` or imperative handle to expose scrolling
- Pass `highlighted` and `onReply`/`onReplyPress` to `MessageBubble`

---

## 6. Cross-Channel Notifications

### Notification Store

New Zustand store: `packages/client/src/stores/notificationStore.ts`

```typescript
interface MentionNotification {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

interface NotificationState {
  currentNotification: MentionNotification | null;
  showNotification: (notification: MentionNotification) => void;
  dismissNotification: () => void;
}
```

### Global Mention Listener

New hook: `useMentionNotifications()` — called from the main layout.

1. Listens for `mention` events on the socket (regardless of current channel)
2. Suppresses if the user is currently viewing the mentioned channel
3. Calls `notificationStore.showNotification(...)` otherwise

### Snackbar in Main Layout

In `app/(main)/_layout.tsx`:
- Render a React Native Paper `Snackbar` driven by `notificationStore`
- Display: "@AuthorName mentioned you in #channelName" (resolve from query cache)
- Action button: "Go" — navigates via `router.push()` to the channel
- Auto-dismiss after 5 seconds

---

## 7. ChannelScreen Wiring

New state:
- `replyTarget: { messageId, authorId, authorName, content } | null`
- `highlightMessageId: string | null`

New handlers:
- `handleReply(message)` → sets `replyTarget`
- `handleCancelReply()` → clears `replyTarget`
- `handleReplyPress(messageId)` → triggers scroll-to-message + highlight
- Updated `handleSend` → passes `replyToId` and `mentions` via HTTP (through `useSendMessage` mutation), clears reply target

Updated MessageInput props: pass `members`, `replyTarget`, `onCancelReply`.
Updated MessageList props: pass `onReply`, `onReplyPress`, `highlightedMessageId`.

---

## 8. Testing Strategy

### Backend Unit Tests

- `messages.controller.test.ts`: Test createMessage with replyToId (snapshot stored correctly), with mentions array, with both, with invalid replyToId (404), with reply auto-adding author to mentions
- `message.model.test.ts`: Verify schema accepts new fields, defaults

### Backend Integration Tests

- `messages.integration.test.ts`: End-to-end create message with reply + mentions, verify stored correctly, verify mentions deduplication

### BFF Tests

- `messages.socket.test.ts`: Verify `send_message` with replyToId/mentions passes through; verify `mention` event emitted to correct user rooms; verify sender excluded from mention events

### Client Tests

- `MentionAutocomplete.test.tsx`: Renders when `@` typed, filters members, selection replaces text
- `MessageInput.test.tsx`: Reply preview renders, cancel clears, send includes replyToId + mentions
- `MessageBubble.test.tsx`: Reply indicator renders when replyTo present, mention highlight applied
- `notificationStore.test.ts`: Show/dismiss notification state

### E2E Tests

- Send message with @mention → verify highlight for mentioned user
- Reply to message → verify reply indicator, scroll-to-message
- Cross-channel mention → verify toast appears

---

## Files Changed (Summary)

### New Files
- `packages/server/src/messages/mentions.helper.ts` — shared mention event emission logic
- `packages/client/src/components/chat/MentionAutocomplete.tsx`
- `packages/client/src/stores/notificationStore.ts`
- `packages/client/src/hooks/useMentionNotifications.ts` — global mention listener hook

### Modified Files
- `packages/messagingService/src/messages/message.model.ts` — add replyTo, mentions
- `packages/messagingService/src/messages/messages.controller.ts` — accept + process replyTo, mentions
- `packages/server/src/socket/index.ts` — join user room on connect
- `packages/server/src/messages/messages.socket.ts` — validate new fields, emit mention events
- `packages/server/src/messages/messages.client.ts` — pass new fields
- `packages/server/src/messages/messages.routes.ts` (or equivalent HTTP controller) — pass replyToId + mentions, emit mention events after HTTP create
- `packages/client/src/types/models.ts` — add replyTo, mentions to Message
- `packages/client/src/types/socket.types.ts` — update payloads, add MentionEvent
- `packages/client/src/types/api.types.ts` — update SendMessageRequest
- `packages/client/src/components/chat/MessageBubble.tsx` — reply button, reply indicator, mention highlight
- `packages/client/src/components/chat/MessageInput.tsx` — autocomplete, reply preview, updated onSend
- `packages/client/src/components/chat/MessageList.tsx` — new props, scroll support
- `packages/client/src/hooks/useSocket.ts` — mention listener (or new hook)
- `packages/client/app/(main)/servers/[serverId]/channels/[channelId].tsx` — wire reply state, mention flow
- `packages/client/app/(main)/_layout.tsx` — notification snackbar
