import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import {
  getMe,
  patchMe,
  getUser,
  getFriends,
  getPendingRequests,
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from './users.client.js';
import { getIO } from '../socket/index.js';

export const usersRouter = Router();

usersRouter.get('/me', async (req: AuthRequest, res) => {
  const result = await getMe(req.userId!);
  res.status(result.status).json(result.data);
});

usersRouter.patch('/me', async (req: AuthRequest, res) => {
  const result = await patchMe(req.userId!, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

// --- Friend routes (before /:id catch-all) ---

usersRouter.get('/me/friends', async (req: AuthRequest, res) => {
  const result = await getFriends(req.userId!);
  res.status(result.status).json(result.data);
});

usersRouter.get('/me/friends/pending', async (req: AuthRequest, res) => {
  const result = await getPendingRequests(req.userId!);
  res.status(result.status).json(result.data);
});

usersRouter.get('/me/friends/:userId/status', async (req: AuthRequest, res) => {
  const result = await getFriendshipStatus(req.userId!, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

usersRouter.post('/me/friends/:userId', async (req: AuthRequest, res) => {
  const targetId = req.params['userId'] as string;
  const result = await sendFriendRequest(req.userId!, targetId);
  res.status(result.status).json(result.data);

  // Emit socket notification on success
  if (result.status < 300) {
    const io = getIO();
    if (io) {
      const meResult = await getMe(req.userId!);
      const me = meResult.data as { user?: { display_name?: string | null; username?: string } } | null;
      const senderName = me?.user?.display_name ?? me?.user?.username ?? 'Someone';
      const responseData = result.data as { status?: string } | null;

      if (responseData?.status === 'accepted') {
        // Auto-accepted: notify both users
        io.to(`user:${targetId}`).emit('friend:request_accepted', {
          accepterId: req.userId!,
          accepterName: senderName,
        });
      } else {
        io.to(`user:${targetId}`).emit('friend:request_received', {
          requesterId: req.userId!,
          requesterName: senderName,
        });
      }
    }
  }
});

usersRouter.patch('/me/friends/:userId/accept', async (req: AuthRequest, res) => {
  const requesterId = req.params['userId'] as string;
  const result = await acceptFriendRequest(req.userId!, requesterId);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }

  // Emit socket notification on success
  if (result.status === 204) {
    const io = getIO();
    if (io) {
      const meResult = await getMe(req.userId!);
      const me = meResult.data as { user?: { display_name?: string | null; username?: string } } | null;
      const accepterName = me?.user?.display_name ?? me?.user?.username ?? 'Someone';
      io.to(`user:${requesterId}`).emit('friend:request_accepted', {
        accepterId: req.userId!,
        accepterName: accepterName,
      });
    }
  }
});

usersRouter.delete('/me/friends/:userId', async (req: AuthRequest, res) => {
  const result = await removeFriend(req.userId!, req.params['userId'] as string);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }
});

usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const result = await getUser(req.userId!, req.params['id'] as string);
  res.status(result.status).json(result.data);
});
