# components/servers/

- **CreateServerForm.tsx** — name (required, 100 char max), description (500 char), visibility toggle (public/private)
- **JoinServerDialog.tsx** — Portal > Dialog with invite code text input; uses `useJoinViaCode()` hook; props: `visible`, `onDismiss`, `onJoined(serverId)`
- **CustomToneForm.tsx** — key (1–10 lowercase alphanumeric), label (1–50 chars), emoji picker, light/dark hex color inputs, text style (normal/italic/medium)
- **ServerIcon.tsx** — initials or attachment image for server; exports `InitialsIcon`, `IconWithAttachment`
- **ServerListItem.tsx** — List.Item with server name, description, server icon
