import React, { useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { ServerMember } from '../../types/models';

interface MentionAutocompleteProps {
  text: string;
  cursorPosition: number;
  members: ServerMember[];
  onSelect: (member: ServerMember, mentionStart: number, mentionEnd: number) => void;
  currentUserId?: string | undefined;
}

function getMentionQuery(text: string, cursor: number): { query: string; start: number; end: number } | null {
  let i = cursor - 1;
  while (i >= 0) {
    const char = text[i];
    if (char === '@') {
      const query = text.slice(i + 1, cursor);
      if (i === 0 || /\s/.test(text[i - 1] ?? '')) {
        return { query, start: i, end: cursor };
      }
      return null;
    }
    if (/\s/.test(char ?? '')) return null;
    i--;
  }
  return null;
}

const MAX_RESULTS = 5;

export function MentionAutocomplete({ text, cursorPosition, members, onSelect, currentUserId }: MentionAutocompleteProps) {
  const theme = useTheme();

  const mention = useMemo(() => getMentionQuery(text, cursorPosition), [text, cursorPosition]);

  const filtered = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return members
      .filter((m) => m.userId !== currentUserId)
      .filter((m) => {
        const name = (m.nickname ?? m.display_name ?? m.username ?? '').toLowerCase();
        const uname = (m.username ?? '').toLowerCase();
        return name.includes(q) || uname.includes(q);
      })
      .slice(0, MAX_RESULTS);
  }, [mention, members, currentUserId]);

  if (!mention || filtered.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.userId}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item, mention.start, mention.end)}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.colors.surfaceVariant }]}
            accessibilityRole="button"
            accessibilityLabel={`Mention ${item.nickname ?? item.display_name ?? item.username}`}
          >
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {item.nickname ?? item.display_name ?? item.username}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              @{item.username}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export { getMentionQuery };

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 8,
    right: 8,
    zIndex: 10,
    marginBottom: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
