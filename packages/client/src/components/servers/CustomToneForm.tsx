import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { TextInput, Button, SegmentedButtons, HelperText, useTheme } from 'react-native-paper';
import type { AddCustomToneRequest } from '../../types/api.types';
import { EmojiPicker } from '../chat/EmojiPicker';

interface CustomToneFormProps {
  onSubmit: (data: AddCustomToneRequest) => void;
  isLoading?: boolean | undefined;
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const KEY_PATTERN = /^[a-z0-9]{1,10}$/;

export function CustomToneForm({ onSubmit, isLoading }: CustomToneFormProps) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [colorLight, setColorLight] = useState('#');
  const [colorDark, setColorDark] = useState('#');
  const [textStyle, setTextStyle] = useState<'normal' | 'italic' | 'medium'>('normal');
  const [error, setError] = useState('');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const theme = useTheme();

  const handleSubmit = () => {
    setError('');
    if (!KEY_PATTERN.test(key)) {
      setError('Key must be 1-10 lowercase letters/numbers');
      return;
    }
    if (!label.trim() || label.length > 50) {
      setError('Label must be 1-50 characters');
      return;
    }
    if (!emoji.trim()) {
      setError('Emoji must be selected');
      return;
    }
    if (!HEX_PATTERN.test(colorLight)) {
      setError('Light color must be a valid hex (e.g., #ff0000)');
      return;
    }
    if (!HEX_PATTERN.test(colorDark)) {
      setError('Dark color must be a valid hex (e.g., #ff5555)');
      return;
    }
    onSubmit({ key, label: label.trim(), emoji: emoji.trim(), colorLight, colorDark, textStyle });
    setKey('');
    setLabel('');
    setEmoji('');
    setColorLight('#');
    setColorDark('#');
    setTextStyle('normal');
  };

  return (
    <View style={styles.container}>
      {error ? (
        <HelperText type="error" visible accessibilityLiveRegion="polite">
          {error}
        </HelperText>
      ) : null}
      <View style={styles.row}>
        <TextInput
          label="Command (e.g. j)"
          value={key}
          onChangeText={(v) => setKey(v.toLowerCase())}
          maxLength={10}
          accessibilityLabel="Tone key"
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          onPress={() => setEmojiPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Pick tone emoji"
          style={[styles.emojiButton, { borderColor: theme.colors.outline }]}
        >
          <Text style={[styles.emojiButtonText, !emoji ? { opacity: 0.4 } : undefined]}>
            {emoji || '😀'}
          </Text>
        </Pressable>
      </View>
      <TextInput
        label="Description (e.g. joking)"
        value={label}
        onChangeText={setLabel}
        maxLength={50}
        accessibilityLabel="Tone label"
        style={styles.input}
      />
      <View style={styles.row}>
        <TextInput
          label="Light mode color"
          value={colorLight}
          onChangeText={setColorLight}
          maxLength={7}
          accessibilityLabel="Light mode color"
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          label="Dark mode color"
          value={colorDark}
          onChangeText={setColorDark}
          maxLength={7}
          accessibilityLabel="Dark mode color"
          style={[styles.input, { flex: 1 }]}
        />
      </View>
      <SegmentedButtons
        value={textStyle}
        onValueChange={(v) => setTextStyle(v as 'normal' | 'italic' | 'medium')}
        buttons={[
          { value: 'normal', label: 'Normal' },
          { value: 'italic', label: 'Italic' },
          { value: 'medium', label: 'Medium' },
        ]}
        style={styles.segmented}
      />
      <Button
        mode="outlined"
        onPress={handleSubmit}
        loading={isLoading ?? false}
        disabled={isLoading ?? false}
        accessibilityLabel="Add custom tone"
      >
        Add Tone
      </Button>
      <EmojiPicker
        visible={emojiPickerVisible}
        onSelect={(e) => { setEmoji(e); setEmojiPickerVisible(false); }}
        onDismiss={() => setEmojiPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    marginBottom: 4,
  },
  segmented: {
    marginBottom: 8,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emojiButtonText: {
    fontSize: 28,
  },
});
