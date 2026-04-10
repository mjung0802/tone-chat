import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as membersApi from '../api/members.api';
import type { UpdateMemberRequest, MuteMemberRequest, BanMemberRequest } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';

export function useMembers(serverId: string) {
  const authReady = useAuthStore((s) => s.isHydrated && s.isAuthenticated);
  return useQuery({
    queryKey: ['servers', serverId, 'members'],
    queryFn: () => membersApi.getMembers(serverId),
    select: (data) => data.members,
    enabled: !!serverId && authReady,
  });
}

export function useMember(serverId: string, userId: string) {
  const authReady = useAuthStore((s) => s.isHydrated && s.isAuthenticated);
  return useQuery({
    queryKey: ['servers', serverId, 'members', userId],
    queryFn: () => membersApi.getMember(serverId, userId),
    select: (data) => data.member,
    enabled: !!serverId && !!userId && authReady,
  });
}

export function useJoinServer(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => membersApi.joinServer(serverId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'members'] });
    },
  });
}

export function useUpdateMember(serverId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMemberRequest) => membersApi.updateMember(serverId, userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'members'] });
    },
  });
}

export function useRemoveMember(serverId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => membersApi.removeMember(serverId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'members'] });
    },
  });
}

function useModerationMutation<TVariables>(
  serverId: string,
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'members'] });
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'audit-log'] });
    },
  });
}

export function useKickMember(serverId: string) {
  return useModerationMutation<string>(serverId, (userId) => membersApi.removeMember(serverId, userId));
}

export function useMuteMember(serverId: string) {
  return useModerationMutation<{ userId: string; data: MuteMemberRequest }>(
    serverId,
    ({ userId, data }) => membersApi.muteMember(serverId, userId, data),
  );
}

export function useUnmuteMember(serverId: string) {
  return useModerationMutation<string>(serverId, (userId) => membersApi.unmuteMember(serverId, userId));
}

export function usePromoteMember(serverId: string) {
  return useModerationMutation<string>(serverId, (userId) => membersApi.promoteMember(serverId, userId));
}

export function useDemoteMember(serverId: string) {
  return useModerationMutation<string>(serverId, (userId) => membersApi.demoteMember(serverId, userId));
}

export function useBanMember(serverId: string) {
  return useModerationMutation<{ userId: string; data: BanMemberRequest }>(
    serverId,
    ({ userId, data }) => membersApi.banMember(serverId, userId, data),
  );
}
