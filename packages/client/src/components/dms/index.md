# components/dms/

- **DmList.tsx** — FlatList of direct message conversations; fetches list via `useDmConversations` hook; empty state when no conversations; divider separating from rest of interface
- **DmListItem.tsx** — conversation list item with avatar, name, latest message preview, timestamp, unread badge (if unread > 0); pressable to open conversation
- **DmRailAvatar.tsx** — compact avatar (32px) for DM rail display with unread badge; renders user initials or avatar image; fetches user display name via `useUser()` hook
