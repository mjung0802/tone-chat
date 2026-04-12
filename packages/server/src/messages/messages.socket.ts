import type { Server, Socket } from 'socket.io';
import * as messagesClient from './messages.client.js';
import { emitMentionsFromResult } from './mentions.helper.js';

function isValidSendMessage(data: unknown): data is { serverId: string; channelId: string; content: string; attachmentIds?: string[]; replyToId?: string; mentions?: string[]; tone?: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d['serverId'] !== 'string' || typeof d['channelId'] !== 'string') return false;
  if (typeof d['content'] !== 'string' || d['content'].length < 1 || d['content'].length > 4000) return false;
  if (d['attachmentIds'] !== undefined) {
    if (!Array.isArray(d['attachmentIds'])) return false;
    if (d['attachmentIds'].length > 6) return false;
    if (!d['attachmentIds'].every((id: unknown) => typeof id === 'string')) return false;
  }
  if (d['replyToId'] !== undefined) {
    if (typeof d['replyToId'] !== 'string' || d['replyToId'].length === 0) return false;
  }
  if (d['mentions'] !== undefined) {
    if (!Array.isArray(d['mentions'])) return false;
    if (d['mentions'].length > 20) return false;
    if (!d['mentions'].every((m: unknown) => typeof m === 'string')) return false;
  }
  if (d['tone'] !== undefined) {
    if (typeof d['tone'] !== 'string' || d['tone'].length === 0 || d['tone'].length > 50) return false;
  }
  return true;
}

function isValidChannelRef(data: unknown): data is { serverId: string; channelId: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d['serverId'] === 'string' && typeof d['channelId'] === 'string';
}

function isValidToggleReaction(data: unknown): data is { serverId: string; channelId: string; messageId: string; emoji: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d['serverId'] !== 'string' || typeof d['channelId'] !== 'string') return false;
  if (typeof d['messageId'] !== 'string' || !d['messageId']) return false;
  if (typeof d['emoji'] !== 'string' || !d['emoji'] || d['emoji'].length > 32) return false;
  return true;
}

export function registerMessageHandlers(io: Server, socket: Socket, userToken: string, userId: string): void {
  socket.on('send_message', async (data: unknown) => {
    if (!isValidSendMessage(data)) return;

    const body: Record<string, unknown> = {
      content: data.content,
      attachmentIds: data.attachmentIds,
    };
    if (data.replyToId) body['replyToId'] = data.replyToId;
    if (data.mentions) body['mentions'] = data.mentions;
    if (data.tone) body['tone'] = data.tone;

    const result = await messagesClient.createMessage(userToken, data.serverId, data.channelId, body);

    if (result.status === 201) {
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      io.to(room).emit('new_message', result.data);

      emitMentionsFromResult(io, userId, data.serverId, data.channelId, result.data);
    } else {
      const errorData = result.data as { error?: { code?: string; message?: string; mutedUntil?: string } } | null;
      socket.emit('message_error', {
        code: errorData?.error?.code ?? 'SEND_FAILED',
        message: errorData?.error?.message ?? 'Failed to send message',
        ...(errorData?.error?.mutedUntil ? { mutedUntil: errorData.error.mutedUntil } : {}),
      });
    }
  });

  socket.on('typing', (data: unknown) => {
    if (!isValidChannelRef(data)) return;
    const room = `server:${data.serverId}:channel:${data.channelId}`;
    socket.to(room).emit('typing', { userId, channelId: data.channelId }); // userId (not token) is correct for socket event payloads
  });

  socket.on('toggle_reaction', async (data: unknown) => {
    if (!isValidToggleReaction(data)) return;

    const result = await messagesClient.toggleReaction(userToken, data.serverId, data.channelId, data.messageId, {
      emoji: data.emoji,
    });

    if (result.status === 200) {
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      io.to(room).emit('reaction_updated', result.data);
    }
  });
}
