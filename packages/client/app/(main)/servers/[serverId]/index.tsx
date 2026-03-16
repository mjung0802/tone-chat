import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useChannels } from "@/hooks/useChannels";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function ServerIndexScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: channels, isLoading } = useChannels(serverId ?? "");

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

  return (
    <Redirect
      href={`/(main)/servers/${serverId}/channels/${firstChannel._id}`}
    />
  );
}
