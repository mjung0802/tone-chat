import type { Server, Socket } from 'socket.io';
import * as dmsClient from './dms.client.js';
import { isBlockedBidirectional } from '../users/users.client.js';

function isValidJoinDm(data: unknown): data is { conversationId: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d['conversationId'] === 'string' && d['conversationId'].length > 0;
}

function isValidDmSend(data: unknown): data is {
  conversationId: string;
  content?: string;
  attachmentIds?: string[];
  replyToId?: string;
  mentions?: string[];
  tone?: string;
} {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (typeof d['conversationId'] !== 'string' || d['conversationId'].length === 0) return false;

  const hasContent =
    typeof d['content'] === 'string' &&
    d['content'].length >= 1 &&
    d['content'].length <= 4000;

  const hasAttachments =
    Array.isArray(d['attachmentIds']) && (d['attachmentIds'] as unknown[]).length > 0;

  if (!hasContent && !hasAttachments) return false;

  if (d['attachmentIds'] !== undefined) {
    if (!Array.isArray(d['attachmentIds'])) return false;
    if ((d['attachmentIds'] as unknown[]).length > 6) return false;
    if (!(d['attachmentIds'] as unknown[]).every((id) => typeof id === 'string')) return false;
  }

  if (d['replyToId'] !== undefined) {
    if (typeof d['replyToId'] !== 'string' || d['replyToId'].length === 0) return false;
  }

  if (d['mentions'] !== undefined) {
    if (!Array.isArray(d['mentions'])) return false;
    if ((d['mentions'] as unknown[]).length > 2) return false;
    if (!(d['mentions'] as unknown[]).every((m) => typeof m === 'string')) return false;
  }

  if (d['tone'] !== undefined) {
    if (typeof d['tone'] !== 'string' || d['tone'].length === 0 || d['tone'].length > 50) return false;
  }

  return true;
}

function isValidDmReact(data: unknown): data is { conversationId: string; messageId: string; emoji: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d['conversationId'] === 'string' && d['conversationId'].length > 0 &&
    typeof d['messageId'] === 'string' && d['messageId'].length > 0 &&
    typeof d['emoji'] === 'string' && d['emoji'].length > 0
  );
}

function isValidDmTyping(data: unknown): data is { conversationId: string } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d['conversationId'] === 'string' && d['conversationId'].length > 0;
}

export function registerDmHandlers(io: Server, socket: Socket, userId: string): void {
  const participantCache = new Map<string, string[]>();

  socket.on('join_dm', async (data: unknown) => {
    if (!isValidJoinDm(data)) return;

    const result = await dmsClient.getConversation(userId, data.conversationId);
    if (result.status !== 200) {
      socket.emit('error', { message: 'Conversation not found or access denied' });
      return;
    }

    const conversation = result.data as { conversation?: { participantIds?: string[] } } | null;
    const participantIds = conversation?.conversation?.participantIds ?? [];
    participantCache.set(data.conversationId, participantIds);

    void socket.join(`dm:${data.conversationId}`);
  });

  socket.on('leave_dm', (data: unknown) => {
    if (!isValidJoinDm(data)) return;
    void socket.leave(`dm:${data.conversationId}`);
    participantCache.delete(data.conversationId);
  });

  socket.on('dm:send', async (data: unknown) => {
    if (!isValidDmSend(data)) return;

    let participantIds = participantCache.get(data.conversationId);
    if (participantIds === undefined) {
      const result = await dmsClient.getConversation(userId, data.conversationId);
      if (result.status === 200) {
        const conversation = result.data as { conversation?: { participantIds?: string[] } } | null;
        participantIds = conversation?.conversation?.participantIds ?? [];
        participantCache.set(data.conversationId, participantIds);
      } else {
        participantIds = [];
      }
    }

    const otherUserId = participantIds.find((id) => id !== userId);

    if (otherUserId !== undefined) {
      const blocked = await isBlockedBidirectional(userId, otherUserId);
      if (blocked) {
        socket.emit('dm_error', { code: 'BLOCKED', message: 'You cannot message this user' });
        return;
      }
    }

    const body: Record<string, unknown> = {};
    if (data.content !== undefined) body['content'] = data.content;
    if (data.attachmentIds !== undefined) body['attachmentIds'] = data.attachmentIds;
    if (data.replyToId !== undefined) body['replyToId'] = data.replyToId;
    if (data.mentions !== undefined) body['mentions'] = data.mentions;
    if (data.tone !== undefined) body['tone'] = data.tone;

    const result = await dmsClient.sendDmMessage(userId, data.conversationId, body);

    if (result.status === 201) {
      io.to(`dm:${data.conversationId}`).emit('dm:new_message', result.data);

      if (otherUserId !== undefined) {
        io.to(`user:${otherUserId}`).emit('dm:notification', {
          conversationId: data.conversationId,
          otherUserId: userId,
          preview: body['content'] ? String(body['content']).slice(0, 50) : '📎 Attachment',
        });
      }
    } else {
      const errorData = result.data as { error?: { code?: string; message?: string } } | null;
      socket.emit('dm_error', {
        code: errorData?.error?.code ?? 'SEND_FAILED',
        message: errorData?.error?.message ?? 'Failed to send message',
      });
    }
  });

  socket.on('dm:typing', (data: unknown) => {
    if (!isValidDmTyping(data)) return;
    socket.to(`dm:${data.conversationId}`).emit('dm:typing', { conversationId: data.conversationId, userId });
  });

  socket.on('dm:react', async (data: unknown) => {
    if (!isValidDmReact(data)) return;

    const result = await dmsClient.reactToDmMessage(userId, data.conversationId, data.messageId, { emoji: data.emoji });

    if (result.status === 200) {
      io.to(`dm:${data.conversationId}`).emit('dm:reaction_updated', result.data);
    }
  });

  socket.on('disconnect', () => {
    participantCache.clear();
  });
}
