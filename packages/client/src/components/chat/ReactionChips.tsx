import React, { useState } from "react";
import { View, Pressable, Platform, StyleSheet } from "react-native";
import { Text, IconButton, useTheme, type MD3Theme } from "react-native-paper";

interface ReactionChipsProps {
  reactions: { emoji: string; userIds: string[] }[];
  currentUserId: string | null;
  authorNames?: Record<string, string> | undefined;
  onToggle: (emoji: string) => void;
  onAddReaction: () => void;
}

function ChipWithTooltip({
  reaction,
  isActive,
  tooltipText,
  onToggle,
  theme,
}: {
  reaction: { emoji: string; userIds: string[] };
  isActive: boolean;
  tooltipText: string;
  onToggle: () => void;
  theme: MD3Theme;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <View style={styles.chipWrapper}>
      {showTooltip ? (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.colors.inverseSurface,
            },
          ]}
        >
          <Text
            style={[
              styles.tooltipText,
              { color: theme.colors.inverseOnSurface },
            ]}
          >
            {tooltipText}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPointerEnter={
          Platform.OS === "web" ? () => setShowTooltip(true) : undefined
        }
        onPointerLeave={
          Platform.OS === "web" ? () => setShowTooltip(false) : undefined
        }
        onPress={onToggle}
        style={[
          styles.chip,
          {
            backgroundColor: isActive
              ? theme.colors.primaryContainer
              : theme.colors.surfaceVariant,
            borderColor: isActive
              ? theme.colors.primary
              : theme.colors.outlineVariant,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${reaction.emoji} ${reaction.userIds.length} reaction${reaction.userIds.length !== 1 ? "s" : ""}, ${tooltipText}`}
        testID={`reaction-chip-${reaction.emoji}`}
      >
        <Text style={styles.chipText}>
          {reaction.emoji} {reaction.userIds.length}
        </Text>
      </Pressable>
    </View>
  );
}

export function ReactionChips({
  reactions,
  currentUserId,
  authorNames,
  onToggle,
  onAddReaction,
}: ReactionChipsProps) {
  const theme = useTheme();

  if (reactions.length === 0) return null;

  return (
    <View style={styles.container}>
      {reactions.map((reaction) => {
        const isActive =
          currentUserId != null && reaction.userIds.includes(currentUserId);
        const tooltipText = reaction.userIds
          .map((id) => authorNames?.[id] ?? id)
          .join(", ");

        return (
          <ChipWithTooltip
            key={reaction.emoji}
            reaction={reaction}
            isActive={isActive}
            tooltipText={tooltipText}
            onToggle={() => onToggle(reaction.emoji)}
            theme={theme}
          />
        );
      })}
      <IconButton
        icon="plus"
        size={16}
        onPress={onAddReaction}
        accessibilityLabel="Add reaction"
        style={styles.addButton}
        testID="add-reaction-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 4,
    paddingTop: 4,
    alignItems: "center",
  },
  chipWrapper: {
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  tooltipText: {
    fontSize: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 28,
  },
  chipText: {
    fontSize: 13,
  },
  addButton: {
    margin: 0,
    width: 28,
    height: 28,
  },
});
