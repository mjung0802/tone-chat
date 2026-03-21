# components/servers/

- **CreateServerForm.tsx** — name (required, 100 char max), description (500 char), visibility toggle (public/private)
- **CustomToneForm.tsx** — key (1–10 lowercase alphanumeric), label (1–50 chars), emoji picker, light/dark hex color inputs, text style (normal/italic/medium)
- **ServerIcon.tsx** — initials or attachment image for server; exports `InitialsIcon`, `IconWithAttachment`
- **ServerListItem.tsx** — List.Item with server name, description, server icon
