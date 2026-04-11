import type { Server } from 'socket.io';

interface CreateMessageResult {
  message: { _id: string; mentions?: string[] };
}

export async function emitMentionsFromResult(
  io: Server,
  senderId: string,
  serverId: string,
  channelId: string,
  resultData: unknown,
): Promise<void> {
  const msg = (resultData as CreateMessageResult).message;
  const mentions = msg.mentions ?? [];
  if (mentions.length > 0) {
    await emitMentionEvents(io, senderId, serverId, channelId, msg._id, mentions);
  }
}

export async function emitMentionEvents(
  io: Server,
  senderId: string,
  serverId: string,
  channelId: string,
  messageId: string,
  mentions: string[],
): Promise<void> {
  const uniqueMentions = [...new Set(mentions)].filter((uid) => uid !== senderId);
  if (uniqueMentions.length === 0) return;

  for (const userId of uniqueMentions) {
    io.to(`user:${userId}`).emit('mention', {
      messageId,
      channelId,
      serverId,
      authorId: senderId,
    });
  }
}
