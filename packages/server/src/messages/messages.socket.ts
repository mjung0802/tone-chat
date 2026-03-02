import type { Server, Socket } from 'socket.io';
import * as messagesClient from './messages.client.js';

function isValidSendMessage(data: unknown): data is { serverId: string; channelId: string; content: string; attachmentIds?: string[] } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d['serverId'] !== 'string' || typeof d['channelId'] !== 'string') return false;
  if (typeof d['content'] !== 'string' || d['content'].length < 1 || d['content'].length > 4000) return false;
  if (d['attachmentIds'] !== undefined) {
    if (!Array.isArray(d['attachmentIds'])) return false;
    if (d['attachmentIds'].length > 10) return false;
    if (!d['attachmentIds'].every((id: unknown) => typeof id === 'string')) return false;
  }
  return true;
}

function isValidChannelRef(data: unknown): data is { serverId: string; channelId: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d['serverId'] === 'string' && typeof d['channelId'] === 'string';
}

export function registerMessageHandlers(io: Server, socket: Socket, userId: string): void {
  socket.on('send_message', async (data: unknown) => {
    if (!isValidSendMessage(data)) return;

    const result = await messagesClient.createMessage(userId, data.serverId, data.channelId, {
      content: data.content,
      attachmentIds: data.attachmentIds,
    });

    if (result.status === 201) {
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      io.to(room).emit('new_message', result.data);
    }
  });

  socket.on('typing', (data: unknown) => {
    if (!isValidChannelRef(data)) return;
    const room = `server:${data.serverId}:channel:${data.channelId}`;
    socket.to(room).emit('typing', { userId, channelId: data.channelId });
  });
}
