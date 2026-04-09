import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as bansApi from '../api/bans.api';
import { useAuthStore } from '../stores/authStore';

export function useBans(serverId: string) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['servers', serverId, 'bans'],
    queryFn: () => bansApi.getBans(serverId),
    select: (data) => data.bans,
    enabled: !!serverId && isHydrated && isAuthenticated,
  });
}

export function useUnban(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => bansApi.unbanUser(serverId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'bans'] });
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'audit-log'] });
    },
  });
}
