import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';

export function useFriendSocket(): void {
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleRequestReceived = (event: { requesterId: string; requesterName: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', event.requesterId] });
    };

    const handleRequestAccepted = (event: { accepterId: string; accepterName: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', event.accepterId] });
    };

    socket.on('friend:request_received', handleRequestReceived);
    socket.on('friend:request_accepted', handleRequestAccepted);

    return () => {
      socket.off('friend:request_received', handleRequestReceived);
      socket.off('friend:request_accepted', handleRequestAccepted);
    };
  }, [socket, queryClient]);
}
