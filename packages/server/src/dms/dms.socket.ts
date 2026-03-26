import type { Server, Socket } from 'socket.io';
import * as dmsClient from './dms.client.js';
import { isBlockedBidirectional } from '../users/users.client.js';
import { broadcastDmAndNotify } from './dms.broadcast.js';

function isValidConversationRef(data: unknown): data is { conversationId: string } {
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
  if (!isValidConversationRef(data)) return false;
  const d = data as Record<string, unknown>;

  const hasContent =
    typeof d['content'] === 'string' &&
    d['content'].length >= 1 &&
    d['content'].length <= 4000;

  const hasAttachments =
    Array.isArray(d['attachmentIds']) && d['attachmentIds'].length > 0;

  if (!hasContent && !hasAttachments) return false;

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
    if (d['mentions'].length > 2) return false;
    if (!d['mentions'].every((m: unknown) => typeof m === 'string')) return false;
  }

  if (d['tone'] !== undefined) {
    if (typeof d['tone'] !== 'string' || d['tone'].length === 0 || d['tone'].length > 50) return false;
  }

  return true;
}

function isValidDmReact(data: unknown): data is { conversationId: string; messageId: string; emoji: string } {
  if (!isValidConversationRef(data)) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d['messageId'] === 'string' && d['messageId'].length > 0 &&
    typeof d['emoji'] === 'string' && d['emoji'].length > 0
  );
}

function parseParticipantIds(data: unknown): string[] {
  const conversation = data as { conversation?: { participantIds?: string[] } } | null;
  return conversation?.conversation?.participantIds ?? [];
}

export function registerDmHandlers(io: Server, socket: Socket, userId: string): void {
  const participantCache = new Map<string, string[]>();

  async function resolveParticipants(conversationId: string): Promise<string[]> {
    const cached = participantCache.get(conversationId);
    if (cached !== undefined) return cached;

    const result = await dmsClient.getConversation(userId, conversationId);
    if (result.status !== 200) return [];

    const participantIds = parseParticipantIds(result.data);
    participantCache.set(conversationId, participantIds);
    return participantIds;
  }

  socket.on('join_dm', async (data: unknown) => {
    if (!isValidConversationRef(data)) return;

    const result = await dmsClient.getConversation(userId, data.conversationId);
    if (result.status !== 200) {
      socket.emit('error', { message: 'Conversation not found or access denied' });
      return;
    }

    const participantIds = parseParticipantIds(result.data);
    participantCache.set(data.conversationId, participantIds);

    void socket.join(`dm:${data.conversationId}`);
  });

  socket.on('leave_dm', (data: unknown) => {
    if (!isValidConversationRef(data)) return;
    void socket.leave(`dm:${data.conversationId}`);
    participantCache.delete(data.conversationId);
  });

  socket.on('dm:send', async (data: unknown) => {
    if (!isValidDmSend(data)) return;

    const participantIds = await resolveParticipants(data.conversationId);
    const otherUserId = participantIds.find((id) => id !== userId);

    if (otherUserId !== undefined) {
      const blocked = await isBlockedBidirectional(userId, otherUserId);
      if (blocked) {
        socket.emit('dm_error', { code: 'BLOCKED', message: 'You cannot message this user' });
        return;
      }
    }

    const { conversationId, ...body } = data;
    const result = await dmsClient.sendDmMessage(userId, conversationId, body);

    if (result.status === 201) {
      if (otherUserId !== undefined) {
        void broadcastDmAndNotify(io, conversationId, userId, otherUserId, result.data, data.content);
      } else {
        io.to(`dm:${conversationId}`).emit('dm:new_message', result.data);
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
    if (!isValidConversationRef(data)) return;
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
