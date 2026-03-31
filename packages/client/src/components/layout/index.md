# components/layout/

- **ServerRail.tsx** — 60px vertical nav rail: home button with total DM unread badge, top-5 DM unread avatars (DmRailAvatar), scrollable server icon list (active server highlighted via `contained-tonal` mode, derived from `usePathname`), create server button, join server button (opens JoinServerDialog), profile/logout buttons at bottom
- **ServerSidebar.tsx** — ChannelSidebar wrapper for server routes; extracts serverId and activeChannelId from pathname; passes activeChannelId to ChannelSidebar; handles create-channel dialog (Dialog + Portal)
- **Sidebar.tsx** — 260px sidebar; renders DmList on `home` routes only; hides on server routes (server layout provides its own ChannelSidebar via ServerSidebar)
