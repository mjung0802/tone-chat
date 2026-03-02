import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChannels } from '../../../../src/hooks/useChannels';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';

export default function ServerIndexScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: channels, isLoading } = useChannels(serverId ?? '');
  const router = useRouter();

  // Auto-redirect to the first channel (usually #general)
  useEffect(() => {
    if (channels && channels.length > 0 && serverId) {
      const firstChannel = channels[0];
      if (firstChannel) {
        router.replace(`/(main)/servers/${serverId}/channels/${firstChannel._id}`);
      }
    }
  }, [channels, serverId, router]);

  if (isLoading) {
    return <LoadingSpinner message="Loading channels..." />;
  }

  if (!channels || channels.length === 0) {
    return (
      <EmptyState
        icon="pound"
        title="No channels"
        description="This server has no channels yet."
      />
    );
  }

  return <LoadingSpinner message="Redirecting..." />;
}
