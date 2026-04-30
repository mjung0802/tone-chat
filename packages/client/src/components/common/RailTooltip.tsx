import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';

interface RailTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function RailTooltip({ label, children }: RailTooltipProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return <RailTooltipWeb label={label}>{children}</RailTooltipWeb>;
}

function RailTooltipWeb({ label, children }: RailTooltipProps) {
  const theme = useTheme();
  const wrapperRef = useRef<View>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const handlePointerEnter = () => {
    wrapperRef.current?.measureInWindow((x, y, w, h) => {
      setPosition({ left: x + w + 8, top: y + h / 2 });
    });
  };

  const handlePointerLeave = () => {
    setPosition(null);
  };

  return (
    <View ref={wrapperRef} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {children}
      {position != null ? (
        <Portal>
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: position.left,
                top: position.top,
                backgroundColor: theme.colors.inverseSurface,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.tooltipText, { color: theme.colors.inverseOnSurface }]}
            >
              {label}
            </Text>
          </View>
        </Portal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 200,
    transform: [{ translateY: -12 }],
  },
  tooltipText: {
    fontSize: 12,
  },
});
