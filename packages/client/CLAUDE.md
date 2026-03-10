# Client — CLAUDE.md

## Quick Reference

```bash
pnpm start --web          # Expo dev server (web)
pnpm start --android      # Expo dev server (Android)
pnpm start --ios          # Expo dev server (iOS)
pnpm run typecheck        # tsc --noEmit
pnpm test                 # Jest
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo 55 + Expo Router v4 (file-based routing) |
| UI | React Native Paper v5 (Material Design 3) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Real-time | socket.io-client v4 |
| Testing | Jest + React Native Testing Library |

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
  hooks/
    useAuth.ts                # Login/register mutations
    useUser.ts                # Profile queries/mutations
    useServers.ts             # Server CRUD
    useChannels.ts            # Channel CRUD
    useMessages.ts            # useInfiniteQuery (cursor pagination), optimistic sends
    useMembers.ts             # Member queries/mutations
    useInvites.ts             # Invite CRUD + join-via-code
    useAttachments.ts         # Upload mutation + attachment query (staleTime: Infinity)
    useSocket.ts              # Socket.IO room lifecycle, cache injection, typing
  components/
    chat/                     # MessageBubble, MessageInput, MessageList, TypingIndicator, AttachmentPicker, AttachmentPreview, AttachmentBubble, AttachmentViewer
    servers/                  # ServerIcon, ServerListItem, CreateServerForm
    channels/                 # ChannelListItem, ChannelSidebar
    members/                  # MemberListItem, MemberList
    invites/                  # InviteCard, CreateInviteForm
    common/                   # LoadingSpinner, ErrorBoundary, EmptyState, ConfirmDialog, AccessiblePressable
  theme/
    colors.ts                 # WCAG 2.1 AA palette (4.5:1 contrast), light + dark
    typography.ts             # Min 16px body, supports font scaling to 200%
    index.ts                  # Paper theme objects
  types/
    models.ts                 # User, Server, Channel, Message, ServerMember, Invite, Attachment
    api.types.ts              # Request/response shapes matching BFF routes
    socket.types.ts           # Socket.IO event payloads
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

## Socket.IO Integration

- `useSocketConnection()` — connects/disconnects based on auth state (called in root layout)
- `useChannelSocket(serverId, channelId)` — joins/leaves room, listens for `new_message` (injects into TanStack Query cache) and `typing` events
- `useTypingEmit(serverId, channelId)` — debounced typing emission (2s throttle)
- Room format: `server:<serverId>:channel:<channelId>`

## Attachments

Upload and display of file attachments on messages. Files are sent to `attachmentsService` via the BFF as raw binary (`uploadRaw`).

- **`AttachmentPicker`** — `expo-document-picker` button, calls `onPick` with selected `DocumentPickerAsset[]`. Allowed MIME types: images, mp4/webm, mp3/ogg, pdf, plain text.
- **`AttachmentPreview`** — chips bar above `MessageInput` showing pending uploads with filename (truncated to 20 chars), spinner while uploading, error indicator, and remove button. Exports `PendingAttachment` type.
- **`AttachmentBubble`** — inline in `MessageBubble`, fetches attachment metadata via `useAttachment(id)`. Renders image (pressable → `AttachmentViewer`) or file card (pressable → `Linking.openURL`). Shows "Attachment unavailable" for errors/non-ready status.
- **`AttachmentViewer`** — fullscreen modal with pinch-to-zoom for image attachments. Opened from `MessageBubble` → `onImagePress` → `ChannelScreen` state.
- **`MessageInput`** orchestrates the flow: pick → upload (via `useUpload().mutateAsync`) → collect IDs → pass to `onSend(content, attachmentIds)`. Max 5 attachments per message.

## Accessibility (WCAG 2.1 AA)

- All interactive elements have `accessibilityRole`, `accessibilityLabel`
- Form errors use `accessibilityLiveRegion="polite"`
- Touch targets min 44x44 dp
- New messages announced via `AccessibilityInfo.announceForAccessibility`
- Color contrast: 4.5:1 normal text, 3:1 large text
- `AccessiblePressable` component enforces a11y props via TypeScript

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

### Mocking `expo-document-picker`

`expo-document-picker` uses native modules that crash Jest. Use a **factory mock** (not a bare `jest.mock()` call) so the module never loads:

```ts
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const DocumentPicker = jest.requireMock('expo-document-picker') as { getDocumentAsync: jest.Mock };
```

Any test file that imports a component which transitively imports `expo-document-picker` (e.g. `MessageInput` → `AttachmentPicker`) must also include this factory mock.

### Module-level state in tests (`client.ts`)

`babel-preset-expo` does **not** downcompile dynamic `import()` to `require()` inside callbacks — `jest.resetModules()` + `await import()` and `jest.isolateModulesAsync()` + `await import()` both fail with "A dynamic import callback was invoked without --experimental-vm-modules".

The correct approach for `client.ts` tests: use a **static import** at the top of the test file. `configureAuth()` resets all module-level state (`isRefreshing`, `refreshPromise`, auth callbacks), so calling it at the start of each test provides the same isolation as re-importing the module.

```ts
// CORRECT — static import, reset via configureAuth() each test
import { configureAuth, get, ApiClientError } from './client';

beforeEach(() => { mockFetch.mockReset(); });

it('...', async () => {
  configureAuth({ getAccessToken: () => 'token', ... }); // resets state
  ...
});
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

## Form Best Practices

- **Reset fields after successful submission** — call the relevant `setState` setters immediately after `onSubmit()` in each form's `handleSubmit`. This prevents stale values from appearing if the user opens the form again. Forms that navigate away on success still benefit, since the component may be kept alive in the navigation stack.

```ts
const handleSubmit = () => {
  if (!name.trim()) return;
  onSubmit({ name: name.trim(), ... });
  setName('');          // reset after submit
  setOtherField('');
};
```

## Theme & Loading Gotchas

- **Always apply `theme.colors.background` to full-screen containers** — transparent containers inherit the browser's default white, which clashes with dark-mode text/spinners. Use `useTheme()` from `react-native-paper` and apply `{ backgroundColor: theme.colors.background }` as an inline style, as `LoadingSpinner` does.
- **`app/+not-found.tsx`** — catch-all route that redirects unknown paths. Must exist so Expo Router doesn't render a blank screen on unmatched URLs.

## BFF Routes Reference

All routes prefixed `/api/v1`. Auth routes are public; all others require `Authorization: Bearer <token>`.

| Domain | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/auth` | `POST /register`, `POST /login`, `POST /refresh` |
| Users | `/users` | `GET /me`, `PATCH /me`, `GET /:id` |
| Servers | `/servers` | CRUD, `GET` returns user's memberships |
| Channels | `/servers/:sid/channels` | CRUD, sorted by position |
| Messages | `/servers/:sid/channels/:cid/messages` | `GET` (cursor: `?before=`), `POST`, `PATCH /:mid` |
| Members | `/servers/:sid/members` | `POST` (join), `GET`, `PATCH /:uid`, `DELETE /:uid` |
| Invites | `/servers/:sid/invites` | `POST`, `GET`, `DELETE /:code`; `POST /invites/:code/join` (top-level) |
| Attachments | `/attachments` | `POST /upload?filename=` (raw binary), `GET /:id` |
