import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { AuditLogItem } from '@/components/auditLog/AuditLogItem';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useMembers } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLevel, type Role } from '@/utils/roles';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';

export default function AuditLogScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const sid = serverId ?? '';
  const userId = useAuthStore((s) => s.userId);
  const theme = useTheme();

  const { data: server, isLoading: serverLoading } = useServer(sid);
  const { data: members } = useMembers(sid);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditLog(sid);

  if (serverLoading || !members) return <LoadingSpinner message="Loading..." />;
  if (!server) return <EmptyState title="Server not found" description="This server does not exist." />;

  const me = members?.find((m) => m.userId === userId);
  const isOwner = server.ownerId === userId;
  const myRole = (me?.role ?? 'member') as Role;
  const roleLevel = getRoleLevel(myRole, isOwner);

  if (roleLevel < getRoleLevel('admin', false)) {
    return <Redirect href={`/servers/${sid}`} />;
  }

  const entries = data?.entries ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>Audit Log</Text>
      {isLoading ? (
        <LoadingSpinner message="Loading audit log..." />
      ) : entries.length === 0 ? (
        <EmptyState title="No entries" description="No moderation actions have been recorded yet." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <AuditLogItem entry={item} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasNextPage ? (
              <View style={styles.footer}>
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Button mode="text" onPress={() => void fetchNextPage()}>
                    Load more
                  </Button>
                )}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
});
