# components/common/

- **AccessiblePressable.tsx** — `Pressable` wrapper requiring `accessibilityLabel` + `accessibilityRole` at type level; enforces 44×44 touch target
- **ConfirmDialog.tsx** — portal modal: title, message, cancel/confirm buttons; `destructive` prop for red confirm
- **EmptyState.tsx** — centered icon + title + optional description + optional action button
- **ErrorBoundary.tsx** — class component with retry button; accepts custom fallback
- **LoadingSpinner.tsx** — full-screen spinner with optional message; role "progressbar"
- **NotificationBanner.tsx** — animated slide-down mention banner; "Go" button to navigate; auto-dismisses after 5s; reads from `notificationStore`
- **UserAvatar.tsx** — image or initials fallback; exports `InitialsAvatar`, `AvatarWithAttachment`; props: avatarAttachmentId, name, size
