# packages/client — React Native Client

Expo 55 + Expo Router v5 app targeting web, iOS, Android. Connects to BFF via HTTP and Socket.IO.

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `api/` | Fetch wrapper + domain API modules (auth, messages, servers, channels, members, attachments, bans, invites, users, tones, dms, friends) |
| `stores/` | Zustand stores: instance (active deployment URL), auth (JWT + per-instance persistence), socket (Socket.IO lifecycle), notification (mention alerts + DM unread count), ui (theme + sidebar + friends view state) |
| `hooks/` | TanStack Query hooks per domain; `useSocket` manages real-time room join/leave + cache injection; `useDmSocket` for DM rooms; `useFriends` for friend management |
| `components/` | Domain-organized UI: channels, chat, common, dms, friends, invites, layout, members, servers |
| `theme/` | WCAG 2.1 AA color palettes, MD3 typography, 7 color theme presets |
| `types/` | Shared model, API, and socket TypeScript interfaces |
| `tone/` | Tone tag registry — 9 base tones with animation config (char, emojiSet, driftDir, matchEmojis) + custom tone resolution + `parseToneTag()` + `resolveToneColor()` + `toneTextStyleProps()` |
| `utils/` | Role hierarchy utilities + system notification helpers + mention segment parsing |
| `test-utils/` | Test fixtures + `renderWithProviders` wrapper |

## Key Files
- `src/api/client.ts` — all HTTP calls flow through this; reads BFF URL from `instanceStore` at fetch time; JWT auto-inject + 401 retry
- `src/stores/instanceStore.ts` — `useInstanceStore` — tracks saved deployment URLs + `activeInstance`; all API/socket calls read from here
- `src/stores/authStore.ts` — single source of auth truth; tokens scoped per instance URL (`accessToken:https://…`)
- `src/stores/socketStore.ts` — Socket.IO connection lifecycle
- `src/hooks/useSocket.ts` — room management + message cache injection
- `src/hooks/useMessages.ts` — infinite scroll message query + real-time injection helpers
- `src/tone/toneRegistry.ts` — tone tag parsing and resolution
- `src/utils/roles.ts` — `getAvailableActions()` drives all moderation UI rendering
- `src/components/chat/MessageBubble.tsx` — most complex component; renders tone, reactions, attachments, moderation actions
