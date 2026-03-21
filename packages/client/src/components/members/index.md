# components/members/

- **MemberList.tsx** — FlatList of members with optional moderation callbacks; empty state
- **MemberListItem.tsx** — name, avatar, role badge (Owner/Admin/Mod), muted chip; action buttons revealed on hover (web) / always visible (mobile); uses `getAvailableActions()` from roles util
- **MemberActionDialogs.tsx** — centralized moderation dialog state machine; `DialogType = 'mute'|'kick'|'ban'|'promote'|'demote'|'transfer'|null`; mute has duration radio (60/1440/10080 min); ban has optional reason field
- **MemberList.test.tsx** / **MemberListItem.test.tsx** — unit tests
