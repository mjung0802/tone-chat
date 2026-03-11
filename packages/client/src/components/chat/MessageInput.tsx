import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TextInput, IconButton, useTheme } from 'react-native-paper';
import { AttachmentPicker } from './AttachmentPicker';
import { AttachmentPreview, type PendingAttachment } from './AttachmentPreview';
import { EmojiPicker } from './EmojiPicker';
import { useUpload } from '../../hooks/useAttachments';
import type { DocumentPickerAsset } from 'expo-document-picker';

const MAX_ATTACHMENTS = 6;

interface MessageInputProps {
  onSend: (content: string, attachmentIds: string[]) => void;
  onTyping?: (() => void) | undefined;
  disabled?: boolean | undefined;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const theme = useTheme();
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

    onSend(trimmed, ids);
    setText('');
    setPendingAttachments([]);
  }, [text, pendingAttachments, onSend]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onTyping?.();
    },
    [onTyping],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji);
      onTyping?.();
    },
    [onTyping],
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
      <View style={styles.container}>
        <AttachmentPicker
          onPick={handlePick}
          disabled={disabled || pendingAttachments.length >= MAX_ATTACHMENTS}
        />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
});
