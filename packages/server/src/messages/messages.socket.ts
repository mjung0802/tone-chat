import type { Server, Socket } from 'socket.io';
import * as messagesClient from './messages.client.js';

export function registerMessageHandlers(io: Server, socket: Socket, userId: string): void {
  socket.on('send_message', async (data: { serverId: string; channelId: string; content: string; attachmentIds?: string[] }) => {
    const result = await messagesClient.createMessage(userId, data.serverId, data.channelId, {
      content: data.content,
      attachmentIds: data.attachmentIds,
    });

    if (result.status === 201) {
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      io.to(room).emit('new_message', result.data);
    }
  });

  socket.on('typing', (data: { serverId: string; channelId: string }) => {
    const room = `server:${data.serverId}:channel:${data.channelId}`;
    socket.to(room).emit('typing', { userId, channelId: data.channelId });
  });
}
