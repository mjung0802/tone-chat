# utils/

- **roles.ts** — `getRoleLevel()`, `isAbove()`, `isMemberMuted()`, `getAvailableActions()` → action flags (canMute, canKick, canBan, canPromote, canDemote, canTransferOwnership)
- **roles.test.ts** — unit tests
- **systemNotifications.ts** — `requestNotificationPermission()`, `hasNotificationPermission()`, `showSystemNotification()` — delegates to Web Notification API or expo-notifications
- **screenOptions.ts** — `getDefaultScreenOptions(theme)` — returns shared stack navigator screen options (background color, header style, tint color)
- **systemNotifications.test.ts** — unit tests
