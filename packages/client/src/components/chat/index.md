# components/chat/

- **MessageBubble.tsx** — full message display: avatar, name, timestamp, tone tag (emoji+label+glow), attachments, reactions, reply indicator, hover action buttons (reply, react, mute/kick/ban for others; pencil+trash-can for own messages); inline edit mode (TextInput + Save/Cancel) when pencil pressed
- **MessageList.tsx** — inverted FlatList with imperative scroll ref; empty state; onEndReached for pagination; threads `onSaveEdit`/`onDelete` to bubbles
- **MessageInput.tsx** — input with attachment picker, mention autocomplete, tone picker, emoji picker; max 4000 chars + 6 attachments; Shift+Enter newline on desktop
- **AttachmentBubble.tsx** — inline attachment in message: image (clickable → viewer) or file card
- **AttachmentPicker.tsx** — paperclip button → expo-document-picker; allowed: images, mp4/webm, mp3/ogg, pdf, plain text
- **AttachmentPreview.tsx** — horizontal chip bar for pending uploads with thumbnail, spinner, error, remove; exports `PendingAttachment` interface
- **AttachmentViewer.tsx** — full-screen modal with zoom/pan for image attachments
- **EmojiPicker.tsx** — bottom modal, 8 emoji categories, 8-column grid, category tabs
- **MentionAutocomplete.tsx** — dropdown for @mentions; max 5 matches on nickname/display_name/username; exports `getMentionQuery` helper
- **ReactionChips.tsx** — emoji reaction chips with count, hover tooltips, active highlight; plus button
- **TonePicker.tsx** — horizontal scrollable tone chips (base + custom) above input; absolute positioned
- **TypingIndicator.tsx** — "X is typing..." / "X and Y are typing..." / "Several people are typing..."
- **emojiData.ts** — `emojiCategories` constant: 8 categories with name, icon, emojis[]
