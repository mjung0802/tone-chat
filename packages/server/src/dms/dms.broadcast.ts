import type { Server } from 'socket.io';
import { getUser } from '../users/users.client.js';

export async function broadcastDmAndNotify(
  io: Server,
  conversationId: string,
  senderId: string,
  otherUserId: string,
  resultData: unknown,
  contentPreview: string | undefined,
): Promise<void> {
  io.to(`dm:${conversationId}`).emit('dm:new_message', resultData);

  let senderName = 'Someone';
  try {
    const userResult = await getUser(senderId, senderId);
    if (userResult.status === 200) {
      const userData = userResult.data as { user?: { display_name?: string | null; username?: string } } | null;
      senderName = userData?.user?.display_name ?? userData?.user?.username ?? 'Someone';
    }
  } catch {
    // Fall back to 'Someone'
  }

  io.to(`user:${otherUserId}`).emit('dm:notification', {
    conversationId,
    otherUserId: senderId,
    senderName,
    preview: contentPreview ? contentPreview.slice(0, 50) : '\u{1F4CE} Attachment',
  });
}
