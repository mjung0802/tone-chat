import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton, useTheme } from 'react-native-paper';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: (() => void) | undefined;
  disabled?: boolean | undefined;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const theme = useTheme();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onTyping?.();
    },
    [onTyping],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChange}
        placeholder="Type a message..."
        multiline
        maxLength={4000}
        disabled={disabled ?? false}
        accessibilityLabel="Message input"
        accessibilityHint="Type your message and press send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <IconButton
        icon="send"
        mode="contained"
        onPress={handleSend}
        disabled={disabled || !text.trim()}
        accessibilityLabel="Send message"
        accessibilityHint="Sends the typed message"
        size={24}
        style={styles.sendButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    marginRight: 4,
  },
  sendButton: {
    marginBottom: 4,
  },
});
