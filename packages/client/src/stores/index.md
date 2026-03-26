# stores/

- **authStore.ts** — `useAuthStore` — state: accessToken, refreshToken, userId, isAuthenticated, emailVerified, isHydrated; persists to localStorage (web) / expo-secure-store (native)
- **socketStore.ts** — `useSocketStore` — Socket.IO lifecycle: connect, disconnect, updateToken; URL: `http://localhost:4000`
- **notificationStore.ts** — `useNotificationStore` — mention notification state (currentNotification, currentChannelId), quiet/system preferences; DM unread tracking (dmUnreadEntries: `Record<conversationId, { count, otherUserId }>`), incrementDmUnread(), clearConversationUnread(), clearAllDmUnreads(); selector `selectTotalDmUnread(state)` returns total across all conversations; `hydrateNotificationPreference()`
- **uiStore.ts** — `useUiStore` — theme preference (light/dark/system), tone display (full/reduced), color theme selection, sidebar state; `hydrateTheme()`, `hydrateToneDisplay()`, `hydrateColorTheme()`, `hydrateUiStore()`
- **authStore.test.ts** / **notificationStore.test.ts** / **uiStore.test.ts** — unit tests
