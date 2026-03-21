# packages/client — React Native Client

Expo 55 + Expo Router v5 app targeting web, iOS, Android. Connects to BFF via HTTP and Socket.IO.

## src/ Layout

| Directory | Purpose |
|-----------|---------|
| `api/` | Fetch wrapper + domain API modules (auth, messages, servers, channels, members, attachments, bans, invites, users, tones) |
| `stores/` | Zustand stores: auth (JWT + persistence), socket (Socket.IO lifecycle), notification (mention alerts), ui (theme + sidebar) |
| `hooks/` | TanStack Query hooks per domain; `useSocket` manages real-time room join/leave + cache injection |
| `components/` | Domain-organized UI: channels, chat, common, invites, members, servers |
| `theme/` | WCAG 2.1 AA color palettes, MD3 typography, 7 color theme presets |
| `types/` | Shared model, API, and socket TypeScript interfaces |
| `tone/` | Tone tag registry — 9 base tones + custom tone resolution + `parseToneTag()` |
| `utils/` | Role hierarchy utilities + system notification helpers |
| `test-utils/` | Test fixtures + `renderWithProviders` wrapper |

## Key Files
- `src/api/client.ts` — all HTTP calls flow through this; JWT auto-inject + 401 retry
- `src/stores/authStore.ts` — single source of auth truth; cross-platform token persistence
- `src/stores/socketStore.ts` — Socket.IO connection lifecycle
- `src/hooks/useSocket.ts` — room management + message cache injection
- `src/hooks/useMessages.ts` — infinite scroll message query + real-time injection helpers
- `src/tone/toneRegistry.ts` — tone tag parsing and resolution
- `src/utils/roles.ts` — `getAvailableActions()` drives all moderation UI rendering
- `src/components/chat/MessageBubble.tsx` — most complex component; renders tone, reactions, attachments, moderation actions
