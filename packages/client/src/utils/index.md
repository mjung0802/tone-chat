# utils/

- **roles.ts** — `getRoleLevel()`, `isAbove()`, `isMemberMuted()`, `getAvailableActions()` → action flags (canMute, canKick, canBan, canPromote, canDemote, canTransferOwnership)
- **roles.test.ts** — unit tests
- **systemNotifications.ts** — `requestNotificationPermission()`, `hasNotificationPermission()`, `showSystemNotification()` — delegates to Web Notification API or expo-notifications
- **screenOptions.ts** — `getDefaultScreenOptions(theme)` — returns shared stack navigator screen options (background color, header style, tint color)
- **mentions.ts** — `parseMentionSegments(text)` → splits a message string into typed tokens for styled @mention rendering; exports `TextSegment`, `MentionSegment`, `MentionTokenSegment` types
- **systemNotifications.test.ts** — unit tests
