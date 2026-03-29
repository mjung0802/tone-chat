import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useServer } from '@/hooks/useServers';
import { useUiStore } from '@/stores/uiStore';
import { getDefaultScreenOptions } from '@/utils/screenOptions';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

export default function ServerLayout() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: server, isLoading: serverLoading } = useServer(serverId ?? '');
  const { width } = useWindowDimensions();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const isWide = width >= 768;
  const theme = useTheme();

  if (serverLoading) {
    return <LoadingSpinner />;
  }

  if (!server || !serverId) {
    return <LoadingSpinner message="Server not found" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack
        screenOptions={{
          ...getDefaultScreenOptions(theme),
          headerLeft: () =>
            !isWide ? (
              <IconButton
                icon="menu"
                onPress={toggleSidebar}
                accessibilityLabel="Toggle channel sidebar"
              />
            ) : null,
        }}
      >
        <Stack.Screen name="index" options={{ title: server.name }} />
        <Stack.Screen name="settings" options={{ title: 'Server Settings' }} />
        <Stack.Screen name="channels/[channelId]" options={{ title: '' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
