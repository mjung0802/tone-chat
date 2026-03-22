import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';
import { injectDmMessage } from './useDms';
import type { DirectMessage } from '../types/models';
import type { DirectMessagesResponse } from '../types/api.types';

export function useDmSocket(
  conversationId: string | undefined,
  onTyping?: ((event: { conversationId: string; userId: string }) => void) | undefined,
  onNewMessage?: ((authorId: string) => void) | undefined,
) {
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_dm', { conversationId });

    const handleNewMessage = (data: { message: DirectMessage }) => {
      injectDmMessage(queryClient, data.message);
      onNewMessage?.(data.message.authorId);
    };

    const handleTyping = (event: { conversationId: string; userId: string }) => {
      if (event.conversationId === conversationId) {
        onTyping?.(event);
      }
    };

    const handleReactionUpdated = (data: { message: DirectMessage }) => {
      queryClient.setQueryData<{
        pages: DirectMessagesResponse[];
        pageParams: (string | undefined)[];
          }>(
          ['dms', conversationId, 'messages'],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                messages: page.messages.map((m) => (m._id === data.message._id ? data.message : m)),
              })),
            };
          },
          );
    };

    socket.on('dm:new_message', handleNewMessage);
    socket.on('dm:typing', handleTyping);
    socket.on('dm:reaction_updated', handleReactionUpdated);

    return () => {
      socket.emit('leave_dm', { conversationId });
      socket.off('dm:new_message', handleNewMessage);
      socket.off('dm:typing', handleTyping);
      socket.off('dm:reaction_updated', handleReactionUpdated);
    };
  }, [socket, conversationId, queryClient, onTyping, onNewMessage]);
}
