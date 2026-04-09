import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as serversApi from '../api/servers.api';
import type { CreateServerRequest, UpdateServerRequest, TransferOwnershipRequest, UpdateInviteSettingsRequest } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';

export function useServers() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => serversApi.getServers(),
    select: (data) => data.servers,
    enabled: isHydrated && isAuthenticated,
  });
}

export function useServer(serverId: string) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['servers', serverId],
    queryFn: () => serversApi.getServer(serverId),
    select: (data) => data.server,
    enabled: !!serverId && isHydrated && isAuthenticated,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServerRequest) => serversApi.createServer(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useUpdateServer(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateServerRequest) => serversApi.updateServer(serverId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['servers', serverId], response);
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useDeleteServer(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => serversApi.deleteServer(serverId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['servers', serverId] });
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useTransferOwnership(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferOwnershipRequest) => serversApi.transferOwnership(serverId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId] });
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'members'] });
    },
  });
}

export function useUpdateInviteSettings(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateInviteSettingsRequest) => serversApi.updateInviteSettings(serverId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['servers', serverId], data);
    },
  });
}
