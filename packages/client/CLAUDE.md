# Client — CLAUDE.md

## Quick Reference

```bash
pnpm start --web          # Expo dev server (web)
pnpm start --android      # Expo dev server (Android)
pnpm start --ios          # Expo dev server (iOS)
pnpm run typecheck        # tsc --noEmit
pnpm test                 # Jest (all tests)
npx jest <pattern>        # Jest (filter by pattern — run from packages/client, NOT via pnpm --filter)
pnpm test:e2e             # Playwright E2E (all tests)
pnpm test:e2e:ui          # Playwright UI mode
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo 55 + Expo Router v5 (file-based routing) |
| UI | React Native Paper v5 (Material Design 3) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Real-time | socket.io-client v4 |
| Testing | Jest + React Native Testing Library |
| E2E testing | Playwright 1.44+ |

## Project Structure

```
app/                          # Expo Router screens (file-based routing)
  _layout.tsx                 # Root: QueryClient + Paper + AuthGate
  (auth)/                     # Unauthenticated screens
    login.tsx, register.tsx
  (main)/                     # Authenticated screens (Drawer navigator)
    servers/
      index.tsx               # Server list
      create.tsx              # Create server
      [serverId]/
        _layout.tsx           # Channel sidebar + Stack
        index.tsx             # Redirect to first channel
        settings.tsx          # Server settings / members / invites
        channels/
          [channelId].tsx     # Chat view
    profile/index.tsx
    invites/[code].tsx        # Join via invite code

src/
  api/
    client.ts                 # fetch wrapper: auto-auth, 401→refresh→retry
    {auth,users,servers,channels,messages,members,invites,attachments}.api.ts
  stores/
    authStore.ts              # JWT tokens, SecureStore/localStorage persistence
    socketStore.ts            # Socket.IO connection lifecycle
    uiStore.ts                # Theme preference, sidebar state
    notificationStore.ts      # Mention notification state, channel-aware suppression
  hooks/
    useAuth.ts                # Login/register mutations
    useUser.ts                # Profile queries/mutations
    useServers.ts             # Server CRUD
    useChannels.ts            # Channel CRUD
    useMessages.ts            # useInfiniteQuery (cursor pagination), optimistic sends
    useMembers.ts             # Member queries/mutations; moderation mutations: useMuteMember, useUnmuteMember, useKickMember, useBanMember, usePromoteMember, useDemoteMember
    useInvites.ts             # Invite CRUD + join-via-code
    useAttachments.ts         # Upload mutation + attachment query (staleTime: Infinity)
    useSocket.ts              # Socket.IO room lifecycle, cache injection, typing
    useMentionNotifications.ts # Listens for `mention` socket events, suppresses if viewing that channel
  components/
    chat/                     # MessageBubble, MessageInput, MessageList, TypingIndicator, AttachmentPicker, AttachmentPreview, AttachmentBubble, AttachmentViewer, EmojiPicker, emojiData, MentionAutocomplete
    servers/                  # ServerIcon, ServerListItem, CreateServerForm
    channels/                 # ChannelListItem, ChannelSidebar
    members/                  # MemberListItem, MemberList, MemberActionDialogs
    invites/                  # InviteCard, CreateInviteForm
    common/                   # LoadingSpinner, ErrorBoundary, EmptyState, ConfirmDialog, AccessiblePressable
  theme/
    colors.ts                 # WCAG 2.1 AA palette (4.5:1 contrast), light + dark
    typography.ts             # Min 16px body, supports font scaling to 200%
    index.ts                  # Paper theme objects
  types/
    models.ts                 # User, Server, Channel, Message, ServerMember, ServerBan, Invite, Attachment
    api.types.ts              # Request/response shapes matching BFF routes
    socket.types.ts           # Socket.IO event payloads
  utils/
    roles.ts                  # Role hierarchy: getRoleLevel(), isAbove(), getAvailableActions()
```

## TypeScript Rules

This package extends `expo/tsconfig.base` — **NOT** the root `tsconfig.base.json`. It uses `bundler` module resolution (not `nodenext`) and does **not** use `verbatimModuleSyntax` (incompatible with the RN bundler).

Enabled strict flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

### `exactOptionalPropertyTypes` Pattern

Optional component props **must** include `| undefined` in the type:

```tsx
// WRONG — will error when the parent passes `undefined` implicitly
interface Props {
  label?: string;
  onPress?: () => void;
}

// CORRECT
interface Props {
  label?: string | undefined;
  onPress?: (() => void) | undefined;
}
```

When passing optional values to third-party components (Paper, React Navigation) that don't accept `undefined`, use fallback values:

```tsx
disabled={isLoading ?? false}   // not disabled={isLoading}
loading={isLoading ?? false}    // not loading={isLoading}
```

## API Client (`src/api/client.ts`)

- Base URL: `http://localhost:4000/api/v1` (the BFF)
- Auto-injects `Authorization: Bearer <token>` from auth store
- On 401: attempts token refresh via `/auth/refresh`, retries the original request once, or forces logout
- Deduplicates concurrent refresh attempts (single in-flight refresh promise)
- `configureAuth()` resets `isRefreshing`/`refreshPromise` — call it at the start of each test to get clean state without module re-loading
- Exports: `get<T>()`, `post<T>()`, `patch<T>()`, `del<T>()`, `uploadRaw<T>()`

## Auth Flow

1. Login/register → store `accessToken` (JWT, 15 min) + `refreshToken` (opaque, 7 days)
2. Tokens persist to `expo-secure-store` (native) / `localStorage` (web)
3. On app launch, `authStore.hydrate()` loads tokens and validates expiry
4. Socket.IO connects with `auth: { token }` in handshake
5. API client auto-refreshes expired access tokens transparently
6. After registration, the user must verify their email via a 6-digit OTP before gaining full access. The BFF exposes `POST /auth/verify-email` and `POST /auth/resend-verification`.

## Socket.IO Integration

- `useSocketConnection()` — connects/disconnects based on auth state (called in root layout)
- `useChannelSocket(serverId, channelId)` — joins/leaves room, listens for `new_message` (injects into TanStack Query cache) and `typing` events
- `useTypingEmit(serverId, channelId)` — debounced typing emission (2s throttle)
- `useMentionNotifications()` — listens for `mention` events on user-level room (`user:<userId>`), called in root layout. Suppresses notifications for the channel the user is currently viewing.
- Room format: channel rooms `server:<serverId>:channel:<channelId>`, user rooms `user:<userId>`

## Attachments

Upload and display of file attachments on messages. Files are sent to `attachmentsService` via the BFF as raw binary (`uploadRaw`).

- **`AttachmentPicker`** — `expo-document-picker` button, calls `onPick` with selected `DocumentPickerAsset[]`. Allowed MIME types: images, mp4/webm, mp3/ogg, pdf, plain text.
- **`AttachmentPreview`** — chips bar above `MessageInput` showing pending uploads with filename (truncated to 20 chars), spinner while uploading, error indicator, and remove button. Exports `PendingAttachment` type.
- **`AttachmentBubble`** — inline in `MessageBubble`, fetches attachment metadata via `useAttachment(id)`. Renders image (pressable → `AttachmentViewer`) or file card (pressable → `Linking.openURL`). Shows "Attachment unavailable" for errors/non-ready status.
- **`AttachmentViewer`** — fullscreen modal with pinch-to-zoom for image attachments. Opened from `MessageBubble` → `onImagePress` → `ChannelScreen` state.
- **`MessageInput`** orchestrates the flow: pick → upload (via `useUpload().mutateAsync`) → collect IDs → pass to `onSend(content, attachmentIds)`. Max 6 attachments per message. Also hosts the emoji picker button.

## Role Hierarchy & Moderation

Role logic lives in `src/utils/roles.ts`. The `owner` role is implicit (determined by `server.ownerId`, not stored on the member).

- **`getRoleLevel(role, isOwner)`** — maps `member`→0, `mod`→1, `admin`→2, `owner`→3
- **`isAbove(actorRole, actorIsOwner, targetRole, targetIsOwner)`** — true if actor outranks target
- **`getAvailableActions(actorRole, actorIsOwner, targetRole, targetIsOwner): AvailableActions`** — returns 6 boolean flags: `canMute`, `canKick`, `canBan`, `canPromote`, `canDemote`, `canTransferOwnership`

UI components (`src/components/members/`):
- **`MemberListItem`** — renders role badge, muted chip, and inline action `IconButton`s based on `getAvailableActions()`
- **`MemberActionDialogs`** — centralized dialog state machine (`dialogType`) for mute (duration picker), kick/ban (confirmation + optional reason), promote/demote/transfer confirmation dialogs

Moderation is surfaced in `app/(main)/servers/[serverId]/settings.tsx`:
- Members section uses `MemberList` + `MemberActionDialogs`, driven by `dialogMember` + `dialogType` local state
- Bans section lists active bans with unban button; uses `useBans` / `useUnban` hooks
- Access guard: only `admin`/`owner` can reach the settings screen (redirects others via `getRoleLevel()` check)

## Accessibility (WCAG 2.1 AA)

- All interactive elements need `accessibilityRole` + `accessibilityLabel`; use `AccessiblePressable` to enforce this at the type level.
- Form errors: `accessibilityLiveRegion="polite"`. New messages: `AccessibilityInfo.announceForAccessibility`.
- Touch targets min 44×44 dp. Color contrast 4.5:1 normal text, 3:1 large text.

## Testing Patterns

### Mocking API modules

Use `jest.mocked()` instead of `require()` + `as jest.Mock` casts:

```ts
import * as messagesApi from '../api/messages.api';
jest.mock('../api/messages.api');

// CORRECT
jest.mocked(messagesApi.sendMessage).mockResolvedValueOnce(...);

// WRONG — avoid require() + manual cast
const messagesApi = require('../api/messages.api') as typeof import('../api/messages.api');
(messagesApi.sendMessage as jest.Mock).mockResolvedValueOnce(...);
```

## E2E Testing (Playwright)

E2E tests live in `e2e/` and run against the Expo web dev server (Metro on `:19081`). All BFF calls are intercepted with `page.route()` — no real backend is needed.

### Structure

```
e2e/
  helpers/
    fixtures.ts       # Mock data (MOCK_USER, MOCK_SERVER, MOCK_CHANNEL, etc.)
    mocks.ts          # page.route() registration functions (mockAuthRoutes, mockServersRoutes, etc.)
  auth.setup.ts       # Playwright setup project — logs in, saves storageState to e2e/.auth/user.json
  auth.spec.ts        # Login/logout flows (unauthenticated context)
  servers.spec.ts     # Server list, empty state, navigation
  chat.spec.ts        # Message display, send, send-button state
  profile.spec.ts     # Profile view and save
  tsconfig.json       # Standalone tsconfig (commonjs/node — does NOT extend expo/tsconfig.base)
```

### Running E2E Tests

```bash
# First time only — install Chromium
pnpm --filter tone-chat-client exec playwright install chromium

# Run all tests (Metro auto-starts on :19081)
pnpm --filter tone-chat-client test:e2e

# Interactive debug UI
pnpm --filter tone-chat-client test:e2e:ui

# Typecheck E2E files only
npx tsc -p e2e/tsconfig.json --noEmit
```

## Routing Patterns

### Declarative redirects — use `<Redirect>`, not `useEffect` + `router.replace()`

`router.replace()` called inside a `useEffect` during component mount is unreliable in Expo Router v4 — the navigation framework may not have settled the route yet, so the call is silently dropped (resulting in a spinner that never resolves).

Use the declarative `<Redirect>` component instead:

```tsx
// WRONG — replace call may be dropped before navigation settles
import { useRouter } from 'expo-router';

useEffect(() => {
  if (target) router.replace(`/some/path/${target}`);
}, [target, router]);

return <LoadingSpinner message="Redirecting..." />;

// CORRECT — declarative, handles timing correctly
import { Redirect } from 'expo-router';

if (!target) return <EmptyState ... />;
return <Redirect href={`/some/path/${target}`} />;
```

## BFF Routes Reference

All routes prefixed `/api/v1`. Auth routes are public; all others require `Authorization: Bearer <token>`.

| Domain | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/auth` | `POST /register`, `POST /login`, `POST /refresh` |
| Users | `/users` | `GET /me`, `PATCH /me`, `GET /:id` |
| Servers | `/servers` | CRUD, `GET` returns user's memberships |
| Channels | `/servers/:sid/channels` | CRUD, sorted by position |
| Messages | `/servers/:sid/channels/:cid/messages` | `GET` (cursor: `?before=`), `POST`, `PATCH /:mid` |
| Members | `/servers/:sid/members` | `POST` (join), `GET`, `PATCH /:uid`, `DELETE /:uid` (kick); moderation: `POST /:uid/mute`, `DELETE /:uid/mute`, `POST /:uid/promote`, `POST /:uid/demote`, `POST /:uid/ban`, `GET /bans`, `DELETE /bans/:uid` |
| Invites | `/servers/:sid/invites` | `POST`, `GET`, `DELETE /:code`; `POST /invites/:code/join` (top-level) |
| Attachments | `/attachments` | `POST /upload?filename=` (raw binary), `GET /:id` |
