import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dmsApi from '../api/dms.api';
import type { DirectConversationsResponse, DirectMessagesResponse, SendDmRequest } from '../types/api.types';
import type { DirectMessage } from '../types/models';

const PAGE_SIZE = 50;

type DmMessagesCache = {
  pages: DirectMessagesResponse[];
  pageParams: (string | undefined)[];
};

export function useDmConversations() {
  return useQuery({
    queryKey: ['dms'],
    queryFn: () => dmsApi.listConversations(),
    select: (data) => data.conversations,
  });
}

export function useDmMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['dms', conversationId, 'messages'],
    queryFn: ({ pageParam }) =>
      dmsApi.getDmMessages(conversationId!, { limit: PAGE_SIZE, before: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length < PAGE_SIZE) return undefined;
      return lastPage.messages[0]?._id;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      messages: data.pages.flatMap((page) => page.messages),
    }),
    enabled: !!conversationId,
    refetchOnMount: 'always',
  });
}

export function useSendDmMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendDmRequest) => dmsApi.sendDmMessage(conversationId, data),
    onSuccess: (response) => {
      injectDmMessage(queryClient, response.message);
      updateConversationLastMessage(queryClient, response.message);
    },
  });
}

export function useReactToDm(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      dmsApi.reactToDmMessage(conversationId, messageId, { emoji }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', conversationId, 'messages'] });
    },
  });
}

export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) => dmsApi.getOrCreateConversation(otherUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms'] });
    },
  });
}

export function useBlockedIds() {
  return useQuery({
    queryKey: ['blocks'],
    queryFn: () => dmsApi.getBlockedIds(),
    select: (data) => data.blockedIds,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => dmsApi.blockUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => dmsApi.unblockUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });
}

// Helper to update a conversation's lastMessage in the conversations cache
export function updateConversationLastMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  message: DirectMessage,
) {
  queryClient.setQueryData<DirectConversationsResponse>(
    ['dms'],
    (old) => {
      if (!old) return old;
      return {
        conversations: old.conversations.map((conv) =>
          conv._id === message.conversationId
            ? { ...conv, lastMessage: message, lastMessageAt: message.createdAt }
            : conv,
        ),
      };
    },
  );
}

// Helper to inject a socket-received DM into the query cache
export function injectDmMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  message: DirectMessage,
) {
  queryClient.setQueryData<DmMessagesCache>(
    ['dms', message.conversationId, 'messages'],
    (old) => {
      if (!old) return old;
      const lastPage = old.pages[old.pages.length - 1];
      if (!lastPage) return old;
      const exists = lastPage.messages.some((m) => m._id === message._id);
      if (exists) return old;
      return {
        ...old,
        pages: [
          ...old.pages.slice(0, -1),
          { messages: [...lastPage.messages, message] },
        ],
      };
    },
  );
}

// Helper to update an existing DM in the query cache (e.g., reactions changed)
export function updateDmMessageInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: DirectMessage,
) {
  queryClient.setQueryData<DmMessagesCache>(
    ['dms', conversationId, 'messages'],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          messages: page.messages.map((m) => (m._id === message._id ? message : m)),
        })),
      };
    },
  );
}
