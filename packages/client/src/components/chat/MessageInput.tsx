import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TextInput, Icon, IconButton, Text, useTheme } from 'react-native-paper';
import { AttachmentPicker } from './AttachmentPicker';
import { AttachmentPreview, type PendingAttachment } from './AttachmentPreview';
import { EmojiPicker } from './EmojiPicker';
import { TonePicker } from './TonePicker';
import { MentionAutocomplete } from './MentionAutocomplete';
import { useUpload } from '../../hooks/useAttachments';
import { parseToneTag, resolveTone } from '../../tone/toneRegistry';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ServerMember, CustomToneDefinition } from '../../types/models';

const MAX_ATTACHMENTS = 6;

interface MessageInputProps {
  onSend: (content: string, attachmentIds: string[], options?: { replyToId?: string; mentions?: string[]; tone?: string }) => void;
  onTyping?: (() => void) | undefined;
  disabled?: boolean | undefined;
  replyTarget?: {
    messageId: string;
    authorId: string;
    authorName: string;
    content: string;
  } | undefined;
  onCancelReply?: (() => void) | undefined;
  members?: ServerMember[] | undefined;
  currentUserId?: string | undefined;
  customTones?: CustomToneDefinition[] | undefined;
}

export function MessageInput({ onSend, onTyping, disabled, replyTarget, onCancelReply, members, currentUserId, customTones }: MessageInputProps) {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [tonePickerVisible, setTonePickerVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<Set<string>>(new Set());
  const focusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const theme = useTheme();

  useEffect(() => {
    return () => clearTimeout(focusTimerRef.current);
  }, []);
  const upload = useUpload();

  const anyUploading = pendingAttachments.some((a) => a.uploading);
  const hasAttachments = pendingAttachments.some((a) => a.attachment);
  const canSend = (text.trim().length > 0 || hasAttachments) && !anyUploading;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const ids = pendingAttachments
      .filter((a) => a.attachment)
      .map((a) => a.attachment!.id);

    if (!trimmed && ids.length === 0) return;

    // Parse inline tone tag if no tone explicitly selected
    const { cleanContent, toneKey } = parseToneTag(trimmed);
    const finalTone = selectedTone ?? toneKey;
    const finalContent = finalTone ? (cleanContent || trimmed) : trimmed;

    const options: { replyToId?: string; mentions?: string[]; tone?: string } = {};
    if (replyTarget) {
      options.replyToId = replyTarget.messageId;
    }
    if (pendingMentions.size > 0) {
      options.mentions = Array.from(pendingMentions);
    }
    if (finalTone) {
      options.tone = finalTone;
    }

    onSend(finalContent, ids, options);
    setText('');
    setPendingAttachments([]);
    setPendingMentions(new Set());
    setSelectedTone(null);
    // On web, sending triggers multiple re-renders (state clear + mutation
    // onSuccess cache update) that blur the input. Set a short timer during
    // which the onBlur handler will immediately re-focus the DOM element.
    if (Platform.OS === 'web') {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = undefined;
      }, 500);
    }
  }, [text, pendingAttachments, onSend, replyTarget, pendingMentions, selectedTone]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onTyping?.();
    },
    [onTyping],
  );

  const handleBlur = useCallback(() => {
    // After sending, re-renders from state clear and mutation cache update
    // blur the input. Re-focus the DOM element while the send timer is active.
    if (Platform.OS === 'web' && focusTimerRef.current != null) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('[aria-label="Message input"]')?.focus();
      });
    }
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji);
      onTyping?.();
    },
    [onTyping],
  );

  const handleMentionSelect = useCallback(
    (member: ServerMember, start: number, end: number) => {
      const username = member.username ?? member.userId;
      const newText = text.slice(0, start) + `@${username} ` + text.slice(end);
      setText(newText);
      setCursorPosition(start + username.length + 2);
      setPendingMentions((prev) => new Set(prev).add(member.userId));
      onTyping?.();
    },
    [text, onTyping],
  );

  const handlePick = useCallback(
    (files: DocumentPickerAsset[]) => {
      const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
      const toAdd = files.slice(0, remaining);

      const newEntries: PendingAttachment[] = toAdd.map((file) => ({
        file,
        uploading: true,
      }));

      setPendingAttachments((prev) => [...prev, ...newEntries]);

      toAdd.forEach((file) => {
        void (async () => {
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();

            const result = await upload.mutateAsync({
              data: blob,
              filename: file.name,
              contentType: file.mimeType ?? 'application/octet-stream',
            });

            setPendingAttachments((prev) =>
              prev.map((p) =>
                p.file.uri === file.uri
                  ? { ...p, uploading: false, attachment: result.attachment }
                  : p,
              ),
            );
          } catch {
            setPendingAttachments((prev) =>
              prev.map((p) =>
                p.file.uri === file.uri
                  ? { ...p, uploading: false, error: 'Upload failed' }
                  : p,
              ),
            );
          }
        })();
      });
    },
    [pendingAttachments.length, upload],
  );

  const handleRemove = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
      <AttachmentPreview attachments={pendingAttachments} onRemove={handleRemove} />
      {members ? (
        <MentionAutocomplete
          text={text}
          cursorPosition={cursorPosition}
          members={members}
          onSelect={handleMentionSelect}
          currentUserId={currentUserId}
        />
      ) : null}
      {replyTarget ? (
        <View style={[styles.replyPreview, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="reply" size={16} color={theme.colors.primary} />
          <View style={styles.replyPreviewText}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Replying to @{replyTarget.authorName}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {replyTarget.content.slice(0, 80)}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={16}
            onPress={() => onCancelReply?.()}
            accessibilityLabel="Cancel reply"
          />
        </View>
      ) : null}
      {selectedTone ? (
        <View style={styles.tonePreview}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            {resolveTone(selectedTone, customTones)?.emoji} {resolveTone(selectedTone, customTones)?.label ?? selectedTone}
          </Text>
          <IconButton icon="close" size={14} onPress={() => setSelectedTone(null)} accessibilityLabel="Remove tone" />
        </View>
      ) : null}
      <View style={styles.container}>
        <AttachmentPicker
          onPick={handlePick}
          disabled={disabled || pendingAttachments.length >= MAX_ATTACHMENTS}
        />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onBlur={handleBlur}
          onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.end)}
          placeholder="Type a message..."
          maxLength={4000}
          disabled={disabled ?? false}
          accessibilityLabel="Message input"
          accessibilityHint="Type your message and press send"
          submitBehavior="newline"
          onKeyPress={(e) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
              const { shiftKey } = e.nativeEvent as { key: string; shiftKey?: boolean };
              if (!shiftKey) {
                handleSend();
              }
            }
          }}
        />
        <IconButton
          icon="music-note"
          onPress={() => setTonePickerVisible(true)}
          disabled={disabled ?? false}
          accessibilityLabel="Select tone"
          size={24}
          style={styles.emojiButton}
        />
        <IconButton
          icon="emoticon-outline"
          onPress={() => setEmojiPickerVisible(true)}
          disabled={disabled ?? false}
          accessibilityLabel="Open emoji picker"
          size={24}
          style={styles.emojiButton}
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={handleSend}
          disabled={disabled || !canSend}
          accessibilityLabel="Send message"
          accessibilityHint="Sends the typed message"
          size={24}
          style={styles.sendButton}
        />
      </View>
      <EmojiPicker
        visible={emojiPickerVisible}
        onSelect={handleEmojiSelect}
        onDismiss={() => setEmojiPickerVisible(false)}
      />
      <TonePicker
        visible={tonePickerVisible}
        onSelect={(key) => { setSelectedTone(key); setTonePickerVisible(false); }}
        onDismiss={() => setTonePickerVisible(false)}
        customTones={customTones}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative' as const,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    marginRight: 4,
  },
  emojiButton: {
    marginBottom: 4,
  },
  sendButton: {
    marginBottom: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  replyPreviewText: {
    flex: 1,
  },
  tonePreview: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 4,
  },
});
