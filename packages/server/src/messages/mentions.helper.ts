import type { Server } from 'socket.io';
import { getMember } from '../members/members.client.js';

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

  await Promise.all(
    uniqueMentions.map(async (userId) => {
      const result = await getMember(senderId, serverId, userId);
      if (result.status !== 200) return;

      io.to(`user:${userId}`).emit('mention', {
        messageId,
        channelId,
        serverId,
        authorId: senderId,
      });
    }),
  );
}
