import React from 'react';
import { ScrollView, Pressable, View, StyleSheet, useColorScheme } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { BASE_TONES, type ToneDefinition } from '../../tone/toneRegistry';
import type { CustomToneDefinition } from '../../types/models';

interface TonePickerProps {
  visible: boolean;
  onSelect: (toneKey: string) => void;
  onDismiss: () => void;
  customTones?: CustomToneDefinition[] | undefined;
}

export function TonePicker({ visible, onSelect, onDismiss, customTones }: TonePickerProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!visible) return null;

  const customDefs: ToneDefinition[] = (customTones ?? []).map((ct) => ({
    key: ct.key,
    tag: `/${ct.key}`,
    label: ct.label,
    emoji: ct.emoji,
    color: { light: ct.colorLight, dark: ct.colorDark },
    textStyle: ct.textStyle,
  }));

  const allTones = [...BASE_TONES, ...customDefs];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Select tone
        </Text>
        <IconButton icon="close" size={16} onPress={onDismiss} accessibilityLabel="Close tone picker" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {allTones.map((tone) => {
          const chipColor = isDark ? tone.color.dark : tone.color.light;
          return (
            <Pressable
              key={tone.key}
              onPress={() => onSelect(tone.key)}
              style={[styles.chip, { borderColor: chipColor }]}
              accessibilityRole="button"
              accessibilityLabel={`${tone.label} tone`}
            >
              <Text style={styles.chipEmoji}>{tone.emoji}</Text>
              <Text style={[styles.chipLabel, { color: chipColor }]}>{tone.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
  },
});
