import React, { useCallback } from 'react';
import { IconButton } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';

const ALLOWED_TYPES = [
  'image/*',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
  'text/plain',
];

interface AttachmentPickerProps {
  onPick: (files: DocumentPickerAsset[]) => void;
  disabled?: boolean | undefined;
}

export function AttachmentPicker({ onPick, disabled }: AttachmentPickerProps) {
  const handlePress = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ALLOWED_TYPES,
    });

    if (!result.canceled && result.assets.length > 0) {
      onPick(result.assets);
    }
  }, [onPick]);

  return (
    <IconButton
      icon="attachment"
      onPress={handlePress}
      disabled={disabled ?? false}
      accessibilityLabel="Attach file"
      accessibilityHint="Opens file picker to attach a file to your message"
      accessibilityRole="button"
      size={24}
    />
  );
}
