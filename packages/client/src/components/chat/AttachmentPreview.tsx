import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme, IconButton } from 'react-native-paper';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { Attachment } from '../../types/models';

export interface PendingAttachment {
  file: DocumentPickerAsset;
  attachment?: Attachment | undefined;
  uploading: boolean;
  error?: string | undefined;
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (index: number) => void;
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 6) {
    const extStr = name.slice(ext);
    return name.slice(0, max - extStr.length - 1) + '\u2026' + extStr;
  }
  return name.slice(0, max - 1) + '\u2026';
}

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.startsWith('image/') ?? false;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  const theme = useTheme();

  if (attachments.length === 0) return null;

  return (
    <View
      style={[styles.container, { borderTopColor: theme.colors.outlineVariant }]}
      accessibilityLabel={`${attachments.length} file${attachments.length > 1 ? 's' : ''} attached`}
    >
      {attachments.map((item, index) => (
        <View key={item.file.uri} style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}>
          {isImage(item.file.mimeType) ? (
            <Image source={{ uri: item.file.uri }} style={styles.thumbnail} />
          ) : null}
          <Text
            variant="labelSmall"
            numberOfLines={1}
            style={[styles.filename, { color: theme.colors.onSurfaceVariant }]}
          >
            {truncate(item.file.name, 20)}
          </Text>
          {item.uploading ? (
            <ActivityIndicator size={14} style={styles.spinner} />
          ) : null}
          {item.error ? (
            <Text variant="labelSmall" style={{ color: theme.colors.error }}>!</Text>
          ) : null}
          <IconButton
            icon="close"
            size={14}
            onPress={() => onRemove(index)}
            accessibilityLabel={`Remove ${item.file.name}`}
            style={styles.removeButton}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingLeft: 4,
    paddingRight: 0,
    height: 36,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 4,
  },
  filename: {
    maxWidth: 120,
    marginHorizontal: 4,
  },
  spinner: {
    marginHorizontal: 2,
  },
  removeButton: {
    margin: 0,
  },
});
