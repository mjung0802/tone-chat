import React from 'react';
import { View, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useServers } from '../../../src/hooks/useServers';
import { ServerListItem } from '../../../src/components/servers/ServerListItem';
import { LoadingSpinner } from '../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../src/components/common/EmptyState';
import type { Server } from '../../../src/types/models';

export default function ServersScreen() {
  const { data: servers, isLoading, refetch, isRefetching } = useServers();
  const router = useRouter();
  const theme = useTheme();

  if (isLoading) {
    return <LoadingSpinner message="Loading servers..." />;
  }

  const handleServerPress = (server: Server) => {
    router.push(`/(main)/servers/${server._id}`);
  };

  const handleCreate = () => {
    router.push('/(main)/servers/create');
  };

  const renderItem = ({ item }: ListRenderItemInfo<Server>) => (
    <ServerListItem server={item} onPress={handleServerPress} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!servers || servers.length === 0 ? (
        <EmptyState
          icon="server-network"
          title="No servers yet"
          description="Create or join a server to get started"
          actionLabel="Create Server"
          onAction={handleCreate}
        />
      ) : (
        <FlatList
          data={servers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          onRefresh={refetch}
          refreshing={isRefetching}
          accessibilityRole="list"
          accessibilityLabel="Server list"
        />
      )}
      <FAB
        icon="plus"
        onPress={handleCreate}
        style={styles.fab}
        accessibilityLabel="Create new server"
        accessibilityRole="button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
