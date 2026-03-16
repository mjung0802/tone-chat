import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as serversApi from "../api/servers.api";
import type {
  CreateServerRequest,
  UpdateServerRequest,
} from "../types/api.types";

export function useServers() {
  return useQuery({
    queryKey: ["servers"],
    queryFn: () => serversApi.getServers(),
    select: (data) => data.servers,
  });
}

export function useServer(serverId: string) {
  return useQuery({
    queryKey: ["servers", serverId],
    queryFn: () => serversApi.getServer(serverId),
    select: (data) => data.server,
    enabled: !!serverId,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServerRequest) => serversApi.createServer(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useUpdateServer(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateServerRequest) =>
      serversApi.updateServer(serverId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(["servers", serverId], response);
      void queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteServer(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => serversApi.deleteServer(serverId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["servers", serverId] });
      void queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}
