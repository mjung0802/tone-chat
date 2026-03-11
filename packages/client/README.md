# tone-chat-client

React Native client for Tone — a Discord-style chat app. Targets iOS, Android, and Web via Expo.

## Stack

| Layer | Library |
|-------|---------|
| Framework | Expo 55 + Expo Router v5 (file-based routing) |
| UI | React Native Paper v5 (Material Design 3) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Real-time | socket.io-client v4 |
| Testing | Jest + React Native Testing Library |
| E2E testing | Playwright 1.44+ |

## App Structure

```
app/
  _layout.tsx              # Root: QueryClient + Paper + AuthGate
  (auth)/
    login.tsx
    register.tsx
  (main)/                  # Authenticated screens (Drawer navigator)
    servers/
      index.tsx            # Server list
      create.tsx
      [serverId]/
        _layout.tsx        # Channel sidebar + Stack
        index.tsx          # Redirect to first channel
        settings.tsx       # Server settings / members / invites
        channels/
          [channelId].tsx  # Chat view
    profile/index.tsx
    invites/[code].tsx     # Join via invite code
```

## Key Directories

```
src/
  api/
    client.ts              # fetch wrapper: auto-auth, 401→refresh→retry
    auth.api.ts
    users.api.ts
    servers.api.ts
    channels.api.ts
    messages.api.ts
    members.api.ts
    invites.api.ts
    attachments.api.ts
  stores/
    authStore.ts           # JWT tokens + SecureStore/localStorage persistence
    socketStore.ts         # Socket.IO connection lifecycle
    uiStore.ts             # Theme preference, sidebar state
  hooks/
    useAuth.ts
    useUser.ts
    useServers.ts
    useChannels.ts
    useMessages.ts         # useInfiniteQuery (cursor pagination)
    useMembers.ts
    useInvites.ts
    useAttachments.ts
    useSocket.ts           # Room lifecycle + cache injection + typing
  components/
    chat/                  # MessageBubble, MessageInput, MessageList, TypingIndicator, AttachmentPicker, AttachmentPreview, AttachmentBubble, AttachmentViewer, EmojiPicker, emojiData
    servers/               # ServerIcon, ServerListItem, CreateServerForm
    channels/              # ChannelListItem, ChannelSidebar
    members/               # MemberListItem, MemberList
    invites/               # InviteCard, CreateInviteForm
    common/                # LoadingSpinner, ErrorBoundary, EmptyState, ConfirmDialog, AccessiblePressable
  theme/
    colors.ts              # WCAG 2.1 AA palette (4.5:1 contrast), light + dark
    typography.ts          # Min 16px body, supports font scaling to 200%
    index.ts               # Paper theme objects
  types/
    models.ts              # User, Server, Channel, Message, ServerMember, Invite, Attachment
    api.types.ts           # Request/response shapes matching BFF routes
    socket.types.ts        # Socket.IO event payloads
```

## API Client

- Base URL: `http://localhost:4000/api/v1` (the BFF)
- Auto-injects `Authorization: Bearer <token>` from auth store
- On 401: attempts token refresh via `/auth/refresh`, retries the original request once, then forces logout if that fails
- Deduplicates concurrent refresh attempts

## Auth

1. Login/register → store `accessToken` (JWT, 15 min) + `refreshToken` (7 days)
2. Tokens persist to `expo-secure-store` (native) / `localStorage` (web)
3. On app launch, `authStore.hydrate()` loads tokens and validates expiry
4. Socket.IO connects with `auth: { token }` in handshake

## Real-time

`useChannelSocket(serverId, channelId)` joins the room `server:<serverId>:channel:<channelId>` and listens for:

- `new_message` — injects the new message into TanStack Query cache
- `typing` — shows typing indicator

`useTypingEmit(serverId, channelId)` emits `typing` events with a 2-second throttle.

## Accessibility

- WCAG 2.1 AA color contrast (4.5:1 normal text, 3:1 large text)
- All interactive elements have `accessibilityRole` and `accessibilityLabel`
- Form errors use `accessibilityLiveRegion="polite"`
- Touch targets minimum 44×44 dp
- New messages announced via `AccessibilityInfo.announceForAccessibility`

## Scripts

```bash
pnpm start            # Expo dev server
pnpm web              # Expo dev server (web)
pnpm android          # Expo dev server (Android)
pnpm ios              # Expo dev server (iOS)
pnpm typecheck        # tsc --noEmit
pnpm test             # Jest
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright UI mode (debugging)
```

## TypeScript

Extends `expo/tsconfig.base` (not the root `tsconfig.base.json`). Uses `bundler` module resolution; does **not** use `verbatimModuleSyntax` (incompatible with the React Native bundler).

Enabled strict flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

For `exactOptionalPropertyTypes`, optional props must include `| undefined`:

```tsx
interface Props {
  label?: string | undefined;
  onPress?: (() => void) | undefined;
}
```
