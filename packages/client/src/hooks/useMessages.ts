import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as messagesApi from '../api/messages.api';
import type { SendMessageRequest, UpdateMessageRequest, MessagesResponse } from '../types/api.types';
import type { Message } from '../types/models';

const PAGE_SIZE = 50;

export function useMessages(serverId: string, channelId: string) {
  return useInfiniteQuery({
    queryKey: ['servers', serverId, 'channels', channelId, 'messages'],
    queryFn: ({ pageParam }) =>
      messagesApi.getMessages(serverId, channelId, {
        limit: PAGE_SIZE,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length < PAGE_SIZE) return undefined;
      const oldest = lastPage.messages[0];
      return oldest?._id;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      messages: data.pages.flatMap((page) => page.messages),
    }),
    enabled: !!serverId && !!channelId,
  });
}

export function useSendMessage(serverId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) =>
      messagesApi.sendMessage(serverId, channelId, data),
    onSuccess: (response) => {
      injectMessage(queryClient, response.message);
    },
  });
}

export function useEditMessage(serverId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data }: { messageId: string; data: UpdateMessageRequest }) =>
      messagesApi.updateMessage(serverId, channelId, messageId, data),
    onSuccess: (response) => {
      updateMessageInCache(queryClient, response.message);
    },
  });
}

export function useDeleteMessage(serverId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      messagesApi.deleteMessage(serverId, channelId, messageId),
    onSuccess: (_data, messageId) => {
      removeMessageFromCache(queryClient, serverId, channelId, messageId);
    },
  });
}

export function injectMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  message: Message,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
      }>(
      ['servers', message.serverId, 'channels', message.channelId, 'messages'],
      (old) => {
        if (!old) return old;
        const lastPage = old.pages[old.pages.length - 1];
        if (!lastPage) return old;

        // Avoid duplicates
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

export function updateMessageInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  message: Message,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
      }>(
      ['servers', message.serverId, 'channels', message.channelId, 'messages'],
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

export function removeMessageFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  serverId: string,
  channelId: string,
  messageId: string,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
      }>(
      ['servers', serverId, 'channels', channelId, 'messages'],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            messages: page.messages.filter((m) => m._id !== messageId),
          })),
        };
      },
      );
}
