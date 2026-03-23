import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMembers } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

export default function ServerLayout() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: server, isLoading: serverLoading } = useServer(serverId ?? '');
  const { data: members } = useMembers(serverId ?? '');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const userId = useAuthStore((s) => s.userId);

  const isWide = width >= 768;
  const isAdmin =
    members?.some(
      (m) => m.userId === userId && (m.role === 'admin' || server?.ownerId === m.userId),
    ) ?? false;
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
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerLeft: () =>
            !isWide ? (
              <IconButton
                icon="menu"
                onPress={toggleSidebar}
                accessibilityLabel="Toggle channel sidebar"
              />
            ) : null,
          headerRight: () =>
            isAdmin ? (
              <IconButton
                icon="cog"
                onPress={() => router.push(`/(main)/servers/${serverId}/settings`)}
                accessibilityLabel="Server settings"
              />
            ) : null,
        }}
      >
        <Stack.Screen name="index" options={{ title: server.name }} />
        <Stack.Screen name="settings" options={{ title: 'Server Settings' }} />
        <Stack.Screen name="channels/[channelId]" options={{ title: server.name }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
