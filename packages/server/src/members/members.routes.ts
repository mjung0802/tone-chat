import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './members.client.js';
import * as usersClient from '../users/users.client.js';
import { removeUserFromServerRooms } from '../socket/index.js';
import { mutationLimiters } from '../shared/rateLimiters.js';

export const membersRouter = Router({ mergeParams: true });

membersRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.joinServer(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listMembers(req.token!, req.params['serverId'] as string);
  if (result.status !== 200) {
    res.status(result.status).json(result.data);
    return;
  }
  const { members } = result.data as { members: Array<Record<string, unknown>> };
  const userIds = members.map((m) => m.userId as string);
  if (userIds.length > 0) {
    const BATCH_SIZE = 100;
    const userMap = new Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }>();
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const usersResult = await usersClient.getUsersBatch(req.token!, batch);
      if (usersResult.status === 200) {
        const { users } = usersResult.data as { users: Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }> };
        for (const u of users) {
          userMap.set(u.id, u);
        }
      }
    }
    for (const member of members) {
      const user = userMap.get(member.userId as string);
      if (user) {
        member.username = user.username;
        member.display_name = user.display_name;
        member.avatar_url = user.avatar_url;
      }
    }
  }
  res.json({ members });
});

membersRouter.get('/:userId', async (req: AuthRequest, res) => {
  const result = await client.getMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.patch('/:userId', async (req: AuthRequest, res) => {
  const result = await client.updateMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

membersRouter.delete('/:userId', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const serverId = req.params['serverId'] as string;
  const targetUserId = req.params['userId'] as string;
  const result = await client.removeMember(req.token!, serverId, targetUserId);
  if (result.status === 204) {
    await removeUserFromServerRooms(targetUserId, serverId);
  }
  res.status(result.status).end();
});

membersRouter.post('/:userId/mute', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const result = await client.muteMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

membersRouter.delete('/:userId/mute', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const result = await client.unmuteMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.post('/:userId/promote', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const result = await client.promoteMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.post('/:userId/demote', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const result = await client.demoteMember(req.token!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.post('/:userId/ban', mutationLimiters.memberAction, async (req: AuthRequest, res) => {
  const serverId = req.params['serverId'] as string;
  const targetUserId = req.params['userId'] as string;
  const result = await client.banMember(req.token!, serverId, targetUserId, req.body as Record<string, unknown>);
  if (result.status === 200) {
    await removeUserFromServerRooms(targetUserId, serverId);
  }
  res.status(result.status).json(result.data);
});
