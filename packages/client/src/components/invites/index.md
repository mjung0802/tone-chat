# components/invites/

- **CreateInviteForm.tsx** — inputs for maxUses + expiresIn (hours); resets on submit; props: onSubmit, isLoading
- **InviteCard.tsx** — shows code (monospace), use count, max uses, expiration, revoke button; marks expired/exhausted
- **InviteModal.tsx** — dialog for sharing a server invite; shows the default invite code with copy button, and a friends list to send invite via DM; guards against double-sends with sendingSet, resets state on open
- **ServerInviteCard.tsx** — inline card rendered inside a DM message when a serverInvite payload is present; uses useJoinViaCode hook for cache invalidation; handles 409 (already member), 403 (banned), 404 (invalid), and generic errors
