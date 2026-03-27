import type { Request, Response } from 'express';
import { ServerBan } from './serverBan.model.js';
import { ServerMember } from '../members/serverMember.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { isAbove, type Role } from '../shared/roles.js';
import { logAuditEvent } from '../auditLog/auditLog.model.js';

export async function banMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const serverId = req.params['serverId'] as string;
  const targetUserId = req.params['userId'] as string;
  const server = req.server!;

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const actorIsOwner = server.ownerId === userId;
  const targetIsOwner = server.ownerId === targetUserId;
  if (!isAbove(req.member!.role as Role, actorIsOwner, target.role as Role, targetIsOwner)) {
    throw new AppError('FORBIDDEN', 'Cannot ban a member with equal or higher role', 403);
  }

  const { reason } = req.body as { reason?: string };

  await ServerBan.create({ serverId, userId: targetUserId, reason, bannedBy: userId });
  await target.deleteOne();
  await logAuditEvent(serverId, 'ban', userId, targetUserId, { reason });

  res.status(201).json({ ban: { serverId, userId: targetUserId, reason, bannedBy: userId } });
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const serverId = req.params['serverId'] as string;
  const targetUserId = req.params['userId'] as string;

  const result = await ServerBan.findOneAndDelete({ serverId, userId: targetUserId });
  if (!result) {
    throw new AppError('BAN_NOT_FOUND', 'Ban not found', 404);
  }

  await logAuditEvent(serverId, 'unban', userId, targetUserId);
  res.status(204).end();
}

export async function listBans(req: Request, res: Response): Promise<void> {
  const { serverId } = req.params;
  const bans = await ServerBan.find({ serverId });
  res.json({ bans });
}
