import { Redirect, useLocalSearchParams } from 'expo-router';
import { useChannels } from '../../../../src/hooks/useChannels';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';

export default function ServerIndexScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: channels, isLoading } = useChannels(serverId ?? '');

  if (isLoading) {
    return <LoadingSpinner message="Loading channels..." />;
  }

  const firstChannel = channels?.[0];

  if (!firstChannel || !serverId) {
    return (
      <EmptyState
        icon="pound"
        title="No channels"
        description="This server has no channels yet."
      />
    );
  }

  return <Redirect href={`/(main)/servers/${serverId}/channels/${firstChannel._id}`} />;
}
