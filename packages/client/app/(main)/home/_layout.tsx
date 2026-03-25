import { getDefaultScreenOptions } from '@/utils/screenOptions';
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';

export default function HomeLayout() {
  const theme = useTheme();

  return <Stack screenOptions={getDefaultScreenOptions(theme)} />;
}
