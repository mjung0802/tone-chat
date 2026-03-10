import React from 'react';
import { View, Image, StyleSheet, Pressable, Linking } from 'react-native';
import { Text, ActivityIndicator, Icon, useTheme } from 'react-native-paper';
import { useAttachment } from '../../hooks/useAttachments';
import type { Attachment } from '../../types/models';

interface AttachmentBubbleProps {
  attachmentId: string;
  onImagePress?: ((attachment: Attachment) => void) | undefined;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentBubble({ attachmentId, onImagePress }: AttachmentBubbleProps) {
  const theme = useTheme();
  const { data, isLoading, isError } = useAttachment(attachmentId);
  const attachment = data?.attachment;

  if (isLoading) {
    return (
      <View style={styles.skeleton}>
        <ActivityIndicator size={16} />
      </View>
    );
  }

  if (isError || !attachment || attachment.status !== 'ready' || !attachment.url) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Attachment unavailable
        </Text>
      </View>
    );
  }

  const isImage = attachment.mime_type.startsWith('image/');

  if (isImage) {
    return (
      <Pressable
        onPress={() => onImagePress?.(attachment)}
        accessibilityRole="image"
        accessibilityLabel={attachment.filename}
      >
        <Image
          source={{ uri: attachment.url }}
          style={styles.image}
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        if (attachment.url) void Linking.openURL(attachment.url);
      }}
      accessibilityRole="link"
      accessibilityLabel={`File: ${attachment.filename}, ${formatSize(attachment.size_bytes)}`}
      style={[styles.fileCard, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      <Icon source="file-outline" size={24} color={theme.colors.onSurfaceVariant} />
      <View style={styles.fileInfo}>
        <Text
          variant="labelMedium"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {attachment.filename}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
          {formatSize(attachment.size_bytes)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 4,
  },
  image: {
    width: 250,
    height: 200,
    borderRadius: 8,
    marginTop: 6,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    gap: 8,
  },
  fileInfo: {
    flex: 1,
  },
});
