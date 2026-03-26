# components/layout/

- **ServerRail.tsx** — 60px vertical nav rail: home button with total DM unread badge, top-5 DM unread avatars (DmRailAvatar), scrollable server icon list, profile/logout buttons at bottom
- **ServerSidebar.tsx** — ChannelSidebar wrapper for server routes; extracts serverId from pathname; handles create-channel dialog (Dialog + Portal)
- **Sidebar.tsx** — 260px sidebar; renders DmList on `home` routes only; hides on server routes (server layout provides its own ChannelSidebar via ServerSidebar)
