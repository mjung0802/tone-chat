import type { Request, Response, NextFunction } from 'express';
import { ServerMember } from '../../members/serverMember.model.js';

export async function requireMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing user identity', status: 401 } });
    return;
  }

  const serverId = req.params['serverId'] as string;
  if (!serverId) {
    res.status(400).json({ error: { code: 'MISSING_SERVER_ID', message: 'serverId is required', status: 400 } });
    return;
  }

  const member = await ServerMember.findOne({ serverId, userId });
  if (!member) {
    res.status(403).json({ error: { code: 'NOT_A_MEMBER', message: 'You are not a member of this server', status: 403 } });
    return;
  }

  req.member = member;
  next();
}
