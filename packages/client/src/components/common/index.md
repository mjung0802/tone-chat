# components/common/

- **AccessiblePressable.tsx** — `Pressable` wrapper requiring `accessibilityLabel` + `accessibilityRole` at type level; enforces 44×44 touch target
- **ConfirmDialog.tsx** — portal modal: title, message, cancel/confirm buttons; `destructive` prop for red confirm
- **EmptyState.tsx** — centered icon + title + optional description + optional action button
- **ErrorBoundary.tsx** — class component with retry button; accepts custom fallback
- **LoadingSpinner.tsx** — full-screen spinner with optional message; role "progressbar"
- **NotificationBanner.tsx** — animated slide-down banner for both mention and DM notifications; type-discriminated via `isMentionNotification()`; "Go" button navigates to channel or DM conversation; auto-dismisses after 5s; reads from `notificationStore`
- **RailTooltip.tsx** — web-only right-side hover tooltip used by `ServerRail`; measures wrapper with `measureInWindow` and renders tooltip via Paper `<Portal>` to escape ScrollView clipping; pass-through Fragment on native
- **UserProfileModal.tsx** — portal modal for viewing a user's profile with server-scoped context; shows role badge, mute status, moderation actions (mute/kick/ban via MemberActionDialogs); "Message" button opens or creates a DM conversation; reads from `uiStore.profileModal`
- **UserAvatar.tsx** — image or initials fallback; exports `InitialsAvatar`, `AvatarWithAttachment`; props: avatarAttachmentId, name, size
