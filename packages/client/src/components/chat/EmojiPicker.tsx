import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { Modal, Portal, IconButton, useTheme } from 'react-native-paper';
import { emojiCategories } from './emojiData';

interface EmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
}

export function EmojiPicker({ visible, onSelect, onDismiss }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, [visible]);

  const handleEmojiPress = useCallback(
    (emoji: string) => {
      onSelect(emoji);
    },
    [onSelect],
  );

  const category = emojiCategories[selectedCategory]!;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
        testID="emoji-picker-modal"
      >
        <View accessibilityLabel="Emoji picker" style={styles.content}>
        <View
          style={[
            styles.categoryRow,
            { borderBottomColor: theme.colors.outlineVariant },
          ]}
        >
          {emojiCategories.map((cat, index) => (
            <IconButton
              key={cat.name}
              icon={() => <Text style={styles.categoryIcon}>{cat.icon}</Text>}
              onPress={() => setSelectedCategory(index)}
              selected={index === selectedCategory}
              accessibilityLabel={cat.name}
              size={20}
              style={styles.categoryButton}
            />
          ))}
        </View>
        <FlatList
          data={category.emojis}
          numColumns={8}
          keyExtractor={(item, index) => `${category.name}-${index}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleEmojiPress(item)}
              style={styles.emojiCell}
              accessibilityRole="button"
              accessibilityLabel={item}
            >
              <Text style={styles.emoji}>{item}</Text>
            </Pressable>
          )}
          style={styles.grid}
        />
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  content: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
  },
  categoryButton: {
    margin: 0,
  },
  categoryIcon: {
    fontSize: 18,
  },
  grid: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  emojiCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minWidth: 44,
    minHeight: 44,
  },
  emoji: {
    fontSize: 24,
  },
});
