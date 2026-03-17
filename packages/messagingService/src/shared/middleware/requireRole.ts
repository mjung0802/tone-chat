import type { Request, Response, NextFunction } from 'express';
import { requireMember } from './requireMember.js';
import { Server } from '../../servers/server.model.js';
import { getRoleLevel, type Role } from '../roles.js';

export function requireRole(minimumRole: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireMember(req, res, async () => {
      if (!req.member) return; // requireMember already sent a response

      const serverId = req.params['serverId'] as string;
      const server = await Server.findById(serverId);
      if (!server) {
        res.status(404).json({ error: { code: 'SERVER_NOT_FOUND', message: 'Server not found', status: 404 } });
        return;
      }

      req.server = server;
      const isOwner = server.ownerId === req.member.userId;
      const memberLevel = getRoleLevel(req.member.role as Role, isOwner);
      const requiredLevel = getRoleLevel(minimumRole, false);

      if (memberLevel < requiredLevel) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: `${minimumRole} access required`, status: 403 } });
        return;
      }

      next();
    });
  };
}
