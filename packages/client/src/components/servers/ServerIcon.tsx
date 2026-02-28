import React from 'react';
import { StyleSheet } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';

interface ServerIconProps {
  name: string;
  icon?: string | undefined;
  size?: number | undefined;
}

export function ServerIcon({ name, icon, size = 48 }: ServerIconProps) {
  const theme = useTheme();

  if (icon) {
    return (
      <Avatar.Image
        source={{ uri: icon }}
        size={size}
        accessibilityLabel={`${name} server icon`}
      />
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar.Text
      label={initials}
      size={size}
      style={{ backgroundColor: theme.colors.primaryContainer }}
      labelStyle={{ color: theme.colors.onPrimaryContainer }}
      accessibilityLabel={`${name} server icon`}
    />
  );
}
