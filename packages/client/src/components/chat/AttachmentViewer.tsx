import React from 'react';
import { Modal, View, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import type { Attachment } from '../../types/models';

interface AttachmentViewerProps {
  visible: boolean;
  attachment: Attachment | null;
  onClose: () => void;
}

export function AttachmentViewer({ visible, attachment, onClose }: AttachmentViewerProps) {
  if (!attachment || !attachment.url) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.header}>
          <Text variant="titleSmall" numberOfLines={1} style={styles.filename}>
            {attachment.filename}
          </Text>
          <IconButton
            icon="close"
            iconColor="#fff"
            onPress={onClose}
            accessibilityLabel="Close viewer"
            size={24}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={3}
          minimumZoomScale={1}
          bouncesZoom
        >
          <Image
            source={{ uri: attachment.url }}
            style={styles.fullImage}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel={attachment.filename}
          />
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 40,
    paddingBottom: 8,
  },
  filename: {
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
