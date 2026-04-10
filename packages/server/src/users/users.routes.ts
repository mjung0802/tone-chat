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
  getBlockedIds,
  blockUser,
  unblockUser,
} from './users.client.js';
import { getIO } from '../socket/index.js';

export const usersRouter = Router();

usersRouter.get('/me', async (req: AuthRequest, res) => {
  const result = await getMe(req.token!);
  res.status(result.status).json(result.data);
});

usersRouter.patch('/me', async (req: AuthRequest, res) => {
  const result = await patchMe(req.token!, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

usersRouter.get('/me/friends', async (req: AuthRequest, res) => {
  const result = await getFriends(req.token!);
  res.status(result.status).json(result.data);
});

usersRouter.get('/me/friends/pending', async (req: AuthRequest, res) => {
  const result = await getPendingRequests(req.token!);
  res.status(result.status).json(result.data);
});

usersRouter.get('/me/friends/:userId/status', async (req: AuthRequest, res) => {
  const result = await getFriendshipStatus(req.token!, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

usersRouter.post('/me/friends/:userId', async (req: AuthRequest, res) => {
  const targetId = req.params['userId'] as string;
  const [result, meResult] = await Promise.all([
    sendFriendRequest(req.token!, targetId),
    getMe(req.token!),
  ]);
  res.status(result.status).json(result.data);

  if (result.status < 300) {
    const io = getIO();
    if (io) {
      const me = meResult.data as { user?: { display_name?: string | null; username?: string } } | null;
      const senderName = me?.user?.display_name ?? me?.user?.username ?? 'Someone';
      const responseData = result.data as { status?: string } | null;

      if (responseData?.status === 'accepted') {
        io.to(`user:${targetId}`).emit('friend:request_accepted', {
          accepterId: req.token!,
          accepterName: senderName,
        });
      } else {
        io.to(`user:${targetId}`).emit('friend:request_received', {
          requesterId: req.token!,
          requesterName: senderName,
        });
      }
    }
  }
});

usersRouter.patch('/me/friends/:userId/accept', async (req: AuthRequest, res) => {
  const requesterId = req.params['userId'] as string;
  const [result, meResult] = await Promise.all([
    acceptFriendRequest(req.token!, requesterId),
    getMe(req.token!),
  ]);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }

  if (result.status === 204) {
    const io = getIO();
    if (io) {
      const me = meResult.data as { user?: { display_name?: string | null; username?: string } } | null;
      const accepterName = me?.user?.display_name ?? me?.user?.username ?? 'Someone';
      io.to(`user:${requesterId}`).emit('friend:request_accepted', {
        accepterId: req.token!,
        accepterName: accepterName,
      });
    }
  }
});

usersRouter.delete('/me/friends/:userId', async (req: AuthRequest, res) => {
  const result = await removeFriend(req.token!, req.params['userId'] as string);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }
});

usersRouter.get('/me/blocks', async (req: AuthRequest, res) => {
  const result = await getBlockedIds(req.token!);
  res.status(result.status).json(result.data);
});

usersRouter.post('/me/blocks/:userId', async (req: AuthRequest, res) => {
  const result = await blockUser(req.token!, req.params['userId'] as string);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }
});

usersRouter.delete('/me/blocks/:userId', async (req: AuthRequest, res) => {
  const result = await unblockUser(req.token!, req.params['userId'] as string);
  if (result.status === 204) {
    res.status(204).end();
  } else {
    res.status(result.status).json(result.data);
  }
});

usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const result = await getUser(req.token!, req.params['id'] as string);
  res.status(result.status).json(result.data);
});
