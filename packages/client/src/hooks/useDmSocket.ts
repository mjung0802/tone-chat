import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';
import { injectDmMessage, updateDmMessageInCache } from './useDms';
import type { DirectMessage } from '../types/models';

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
      updateDmMessageInCache(queryClient, conversationId, data.message);
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

export function useDmTypingEmit(conversationId: string | undefined) {
  const socket = useSocketStore((s) => s.socket);
  const lastEmitRef = useRef(0);

  return useCallback(() => {
    if (!socket || !conversationId) return;

    const now = Date.now();
    if (now - lastEmitRef.current < 2000) return;
    lastEmitRef.current = now;

    socket.emit('dm:typing', { conversationId });
  }, [socket, conversationId]);
}
