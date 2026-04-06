import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './auditLog.client.js';
import * as usersClient from '../users/users.client.js';

type UserInfo = { id: string; username: string; display_name: string | null };

const BATCH_SIZE = 100;

async function fetchUserMap(userId: string, userIds: string[]): Promise<Map<string, UserInfo>> {
  const userMap = new Map<string, UserInfo>();
  if (userIds.length === 0) return userMap;

  const batches = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    batches.push(usersClient.getUsersBatch(userId, userIds.slice(i, i + BATCH_SIZE)));
  }
  const results = await Promise.all(batches);
  for (const result of results) {
    if (result.status === 200) {
      const { users } = result.data as { users: UserInfo[] };
      for (const u of users) {
        userMap.set(u.id, u);
      }
    }
  }
  return userMap;
}

export const auditLogRouter = Router({ mergeParams: true });

auditLogRouter.get('/', async (req: AuthRequest, res) => {
  const serverId = req.params['serverId'] as string;
  const query: { limit?: number; before?: string } = {};
  if (req.query['limit']) query.limit = Number(req.query['limit']);
  if (req.query['before'] && typeof req.query['before'] === 'string') query.before = req.query['before'];

  const result = await client.listAuditLog(req.token!, serverId, query);
  if (result.status !== 200) {
    res.status(result.status).json(result.data);
    return;
  }

  const { entries } = result.data as { entries: Array<Record<string, unknown>> };

  const userIds = [...new Set(entries.flatMap(e => [e.actorId as string, e.targetId as string]))];
  const userMap = await fetchUserMap(req.token!, userIds);

  for (const entry of entries) {
    const actor = userMap.get(entry.actorId as string);
    const target = userMap.get(entry.targetId as string);
    if (actor) {
      entry.actorUsername = actor.username;
      entry.actorDisplayName = actor.display_name;
    }
    if (target) {
      entry.targetUsername = target.username;
      entry.targetDisplayName = target.display_name;
    }
  }

  res.json({ entries });
});
