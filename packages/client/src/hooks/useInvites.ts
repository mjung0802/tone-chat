import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as invitesApi from '../api/invites.api';
import type { CreateInviteRequest } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';

export function useInvites(serverId: string) {
  const authReady = useAuthStore((s) => s.isHydrated && s.isAuthenticated);
  return useQuery({
    queryKey: ['servers', serverId, 'invites'],
    queryFn: () => invitesApi.getInvites(serverId),
    select: (data) => data.invites,
    enabled: !!serverId && authReady,
  });
}

export function useCreateInvite(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: CreateInviteRequest) => invitesApi.createInvite(serverId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'invites'] });
    },
  });
}

export function useRevokeInvite(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => invitesApi.revokeInvite(serverId, code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'invites'] });
    },
  });
}

export function useJoinViaCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => invitesApi.joinViaCode(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useDefaultInvite(serverId: string) {
  const authReady = useAuthStore((s) => s.isHydrated && s.isAuthenticated);
  return useQuery({
    queryKey: ['defaultInvite', serverId],
    queryFn: () => invitesApi.getDefaultInvite(serverId),
    enabled: !!serverId && authReady,
    select: (data) => data.invite,
  });
}
