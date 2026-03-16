import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as channelsApi from "../api/channels.api";
import type {
  CreateChannelRequest,
  UpdateChannelRequest,
} from "../types/api.types";

export function useChannels(serverId: string) {
  return useQuery({
    queryKey: ["servers", serverId, "channels"],
    queryFn: () => channelsApi.getChannels(serverId),
    select: (data) => data.channels,
    enabled: !!serverId,
  });
}

export function useChannel(serverId: string, channelId: string) {
  return useQuery({
    queryKey: ["servers", serverId, "channels", channelId],
    queryFn: () => channelsApi.getChannel(serverId, channelId),
    select: (data) => data.channel,
    enabled: !!serverId && !!channelId,
  });
}

export function useCreateChannel(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelRequest) =>
      channelsApi.createChannel(serverId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["servers", serverId, "channels"],
      });
    },
  });
}

export function useUpdateChannel(serverId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateChannelRequest) =>
      channelsApi.updateChannel(serverId, channelId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["servers", serverId, "channels"],
      });
    },
  });
}

export function useDeleteChannel(serverId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => channelsApi.deleteChannel(serverId, channelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["servers", serverId, "channels"],
      });
    },
  });
}
