import React from 'react';
import { IconButton } from 'react-native-paper';

interface AttachmentPickerProps {
  onPick: () => void;
  disabled?: boolean | undefined;
}

export function AttachmentPicker({ onPick, disabled }: AttachmentPickerProps) {
  return (
    <IconButton
      icon="attachment"
      onPress={onPick}
      disabled={disabled ?? false}
      accessibilityLabel="Attach file"
      accessibilityHint="Opens file picker to attach a file to your message"
      accessibilityRole="button"
      size={24}
    />
  );
}
