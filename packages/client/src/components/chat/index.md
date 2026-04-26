# components/chat/

- **MessageBubble.tsx** — full message display: avatar, name, timestamp, tone tag (via `ToneTag`), kinetic text (via `ToneKineticText`), emoji drift overlay (via `ToneEmojiDrift`), tone glow (border + shadow in `full` mode), attachments, reactions, reply indicator, hover action buttons (reply, react, mute/kick/ban for others; pencil+trash-can for own messages); inline edit mode (TextInput + Save/Cancel) when pencil pressed; reads `toneDisplay` ('full'/'reduced'/'off') from uiStore
- **MessageList.tsx** — inverted FlatList with imperative scroll ref; empty state; onEndReached for pagination; threads `onSaveEdit`/`onDelete` to bubbles
- **MessageInput.tsx** — input with attachment picker, mention autocomplete, tone picker, emoji picker; max 4000 chars + 6 attachments; Shift+Enter newline on desktop
- **AttachmentBubble.tsx** — inline attachment in message: image (clickable → viewer) or file card
- **AttachmentPicker.tsx** — paperclip button → expo-document-picker; allowed: images, mp4/webm, mp3/ogg, pdf, plain text
- **AttachmentPreview.tsx** — horizontal chip bar for pending uploads with thumbnail, spinner, error, remove; exports `PendingAttachment` interface
- **AttachmentViewer.tsx** — full-screen modal with zoom/pan for image attachments
- **EmojiPicker.tsx** — bottom modal, 8 emoji categories, 8-column grid, category tabs
- **MentionAutocomplete.tsx** — dropdown for @mentions; max 5 matches on nickname/display_name/username; exports `getMentionQuery` helper
- **ReactionChips.tsx** — emoji reaction chips with count, hover tooltips, active highlight; plus button; tone-matched emoji chips get colored border + text and a scale+bounce entry animation
- **TonePicker.tsx** — horizontal scrollable tone chips (base + custom) above input; absolute positioned
- **TypingIndicator.tsx** — "X is typing..." / "X and Y are typing..." / "Several people are typing..."
- **ToneEmojiDrift.tsx** — animated emoji particles that drift in a configured direction (UR/U/R/F); 4 sprites fade+translate on loop; falls back to a single static emoji when `reducedMotion` is enabled
- **ToneKineticText.tsx** — renders message text with per-character animations (bounce/tilt/lock/sway/wobble/rise/sink/breathe/jitter); parses @mentions and applies `mentionColor`; no animation when `reducedMotion` is enabled or `displayMode` is not 'full'; exports `ToneKineticTextProps`
- **ToneTag.tsx** — tone tag badge (`/key` or `/key · label`); on web+full mode the label opacity animates in on hover; on mobile the label is always visible; returns null when `displayMode` is 'off'; exports `ToneTagProps`
- **emojiData.ts** — `emojiCategories` constant: 8 categories with name, icon, emojis[]
