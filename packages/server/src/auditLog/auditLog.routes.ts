import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './auditLog.client.js';
import * as usersClient from '../users/users.client.js';

export const auditLogRouter = Router({ mergeParams: true });

auditLogRouter.get('/', async (req: AuthRequest, res) => {
  const serverId = req.params['serverId'] as string;
  const query: { limit?: number; before?: string } = {};
  if (req.query['limit']) query.limit = Number(req.query['limit']);
  if (req.query['before'] && typeof req.query['before'] === 'string') query.before = req.query['before'];

  const result = await client.listAuditLog(req.userId!, serverId, query);
  if (result.status !== 200) {
    res.status(result.status).json(result.data);
    return;
  }

  const { entries } = result.data as { entries: Array<Record<string, unknown>> };

  const userIds = [...new Set(entries.flatMap(e => [e.actorId as string, e.targetId as string]))];

  if (userIds.length > 0) {
    const BATCH_SIZE = 100;
    const userMap = new Map<string, { id: string; username: string; display_name: string | null }>();
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const usersResult = await usersClient.getUsersBatch(req.userId!, batch);
      if (usersResult.status === 200) {
        const { users } = usersResult.data as { users: Array<{ id: string; username: string; display_name: string | null }> };
        for (const u of users) {
          userMap.set(u.id, u);
        }
      }
    }
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
  }

  res.json({ entries });
});
