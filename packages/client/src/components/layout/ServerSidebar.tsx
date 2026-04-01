import { ChannelSidebar } from '@/components/channels/ChannelSidebar';
import { InviteModal } from '@/components/invites/InviteModal';
import { useChannels } from '@/hooks/useChannels';
import { useMembers } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { Channel } from '@/types/models';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';

export function ServerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const userId = useAuthStore((s) => s.userId);

  const serverId = pathname.match(/\/servers\/([^/]+)/)?.[1] ?? '';
  const activeChannelId = pathname.match(/\/channels\/([^/]+)/)?.[1] ?? '';
  const isWide = width >= 768;
  const showSidebar = isWide || isSidebarOpen;

  const { data: server } = useServer(serverId);
  const { data: channels } = useChannels(serverId);
  const { data: members } = useMembers(serverId);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  if (!serverId || !server || !showSidebar) return null;

  const isAdmin =
    members?.some(
      (m) => m.userId === userId && (m.role === 'admin' || server.ownerId === m.userId),
    ) ?? false;

  const canInvite = isAdmin || (server.allowMemberInvites ?? true);

  const handleChannelPress = (channel: Channel) => {
    router.push(`/(main)/servers/${serverId}/channels/${channel._id}`);
    if (!isWide) {
      useUiStore.getState().setSidebarOpen(false);
    }
  };

  return (
    <>
      <ChannelSidebar
        serverName={server.name}
        channels={channels ?? []}
        activeChannelId={activeChannelId}
        onChannelPress={handleChannelPress}
        onInvite={() => setInviteModalVisible(true)}
        canInvite={canInvite}
      />
      <InviteModal
        visible={inviteModalVisible}
        onDismiss={() => setInviteModalVisible(false)}
        serverId={serverId}
        serverName={server.name}
      />
    </>
  );
}
