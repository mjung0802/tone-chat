# components/dms/

- **DmList.tsx** — FlatList of direct message conversations; fetches list via `useDmConversations` hook; derives active conversation from `usePathname` and passes `isActive` to items; empty state when no conversations
- **DmListItem.tsx** — conversation list item with avatar, name, latest message preview; `isActive` prop applies tonal highlight and `accessibilityState.selected`; pressable to open conversation
- **DmRailAvatar.tsx** — compact avatar (32px) for DM rail display with unread badge; renders user initials or avatar image; fetches user display name via `useUser()` hook
