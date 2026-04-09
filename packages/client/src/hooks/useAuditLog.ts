import { useInfiniteQuery } from '@tanstack/react-query';
import * as auditLogApi from '../api/auditLog.api';
import { useAuthStore } from '../stores/authStore';

const PAGE_SIZE = 50;

export function useAuditLog(serverId: string) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: ['servers', serverId, 'audit-log'],
    queryFn: ({ pageParam }) =>
      auditLogApi.getAuditLog(serverId, {
        limit: PAGE_SIZE,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.entries.length < PAGE_SIZE) return undefined;
      const oldest = lastPage.entries[lastPage.entries.length - 1];
      return oldest?._id;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      entries: data.pages.flatMap((page) => page.entries),
    }),
    enabled: !!serverId && isHydrated && isAuthenticated,
  });
}
