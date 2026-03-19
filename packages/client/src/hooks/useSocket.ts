import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AccessibilityInfo } from 'react-native';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';
import { injectMessage, updateMessageInCache } from './useMessages';
import type { Message } from '../types/models';
import type { TypingEvent } from '../types/socket.types';

export function useSocketConnection() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const updateToken = useSocketStore((s) => s.updateToken);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect(accessToken);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  // Update socket token when it changes (after refresh)
  useEffect(() => {
    if (accessToken) {
      updateToken(accessToken);
    }
  }, [accessToken, updateToken]);
}

export function useChannelSocket(
  serverId: string | undefined,
  channelId: string | undefined,
  onTyping?: (event: TypingEvent) => void,
  onNewMessage?: ((authorId: string) => void) | undefined,
) {
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !serverId || !channelId) return;

    socket.emit('join_channel', { serverId, channelId });

    const handleNewMessage = (data: { message: Message }) => {
      injectMessage(queryClient, data.message);
      onNewMessage?.(data.message.authorId);
      AccessibilityInfo.announceForAccessibility('New message received');
    };

    const handleTyping = (event: TypingEvent) => {
      if (event.channelId === channelId) {
        onTyping?.(event);
      }
    };

    const handleReactionUpdated = (data: { message: Message }) => {
      updateMessageInCache(queryClient, data.message);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.emit('leave_channel', { serverId, channelId });
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [socket, serverId, channelId, queryClient, onTyping, onNewMessage]);
}

export function useTypingEmit(serverId: string | undefined, channelId: string | undefined) {
  const socket = useSocketStore((s) => s.socket);
  const lastEmitRef = useRef(0);

  return useCallback(() => {
    if (!socket || !serverId || !channelId) return;

    const now = Date.now();
    // Debounce: only emit every 2 seconds
    if (now - lastEmitRef.current < 2000) return;
    lastEmitRef.current = now;

    socket.emit('typing', { serverId, channelId });
  }, [socket, serverId, channelId]);
}
