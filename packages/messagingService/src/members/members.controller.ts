import type { Request, Response } from 'express';
import { ServerMember } from './serverMember.model.js';
import { Server } from '../servers/server.model.js';
import { ServerBan } from '../bans/serverBan.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { getRoleLevel, isAbove, type Role } from '../shared/roles.js';

export async function joinServer(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;

  const server = await Server.findById(serverId);
  if (!server) {
    throw new AppError('SERVER_NOT_FOUND', 'Server not found', 404);
  }

  if (server.visibility !== 'public') {
    throw new AppError('SERVER_PRIVATE', 'This server is private. Use an invite link to join.', 403);
  }

  const ban = await ServerBan.findOne({ serverId, userId });
  if (ban) {
    throw new AppError('BANNED', 'You are banned from this server', 403);
  }

  const existing = await ServerMember.findOne({ serverId, userId });
  if (existing) {
    throw new AppError('ALREADY_MEMBER', 'You are already a member of this server', 409);
  }

  const member = await ServerMember.create({ serverId, userId });
  res.status(201).json({ member });
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  const members = await ServerMember.find({ serverId: req.params['serverId'] });
  res.json({ members });
}

export async function getMember(req: Request, res: Response): Promise<void> {
  const member = await ServerMember.findOne({ serverId: req.params['serverId'], userId: req.params['userId'] });
  if (!member) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }
  res.json({ member });
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;

  const member = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!member) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const { nickname } = req.body as { nickname?: string };
  if (nickname !== undefined) member.nickname = nickname;

  await member.save();
  res.json({ member });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;

  const server = await Server.findById(serverId);
  if (!server) {
    throw new AppError('SERVER_NOT_FOUND', 'Server not found', 404);
  }

  // Self-leave
  if (targetUserId === userId) {
    if (server.ownerId === userId) {
      throw new AppError('OWNER_CANNOT_LEAVE', 'Owner must transfer ownership or delete the server', 403);
    }
    const result = await ServerMember.findOneAndDelete({ serverId, userId: targetUserId });
    if (!result) {
      throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
    }
    res.status(204).end();
    return;
  }

  // Kick: requires mod+, actor must be above target
  const requester = await ServerMember.findOne({ serverId, userId });
  if (!requester) {
    throw new AppError('NOT_A_MEMBER', 'You are not a member of this server', 403);
  }

  const actorIsOwner = server.ownerId === userId;
  const actorLevel = getRoleLevel(requester.role as Role, actorIsOwner);
  if (actorLevel < getRoleLevel('mod', false)) {
    throw new AppError('FORBIDDEN', 'Moderator access required to kick members', 403);
  }

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const targetIsOwner = server.ownerId === targetUserId;
  if (!isAbove(requester.role as Role, actorIsOwner, target.role as Role, targetIsOwner)) {
    throw new AppError('FORBIDDEN', 'Cannot kick a member with equal or higher role', 403);
  }

  await target.deleteOne();
  res.status(204).end();
}

export async function muteMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;
  const server = req.server!;

  const { duration } = req.body as { duration?: number };
  const allowedDurations = [60, 1440, 10080];
  if (!duration || !allowedDurations.includes(duration)) {
    throw new AppError('INVALID_DURATION', `duration must be one of: ${allowedDurations.join(', ')} (minutes)`, 400);
  }

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const actorIsOwner = server.ownerId === userId;
  const targetIsOwner = server.ownerId === targetUserId;
  if (!isAbove(req.member!.role as Role, actorIsOwner, target.role as Role, targetIsOwner)) {
    throw new AppError('FORBIDDEN', 'Cannot mute a member with equal or higher role', 403);
  }

  target.mutedUntil = new Date(Date.now() + duration * 60 * 1000);
  await target.save();
  res.json({ member: target });
}

export async function unmuteMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;
  const server = req.server!;

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const actorIsOwner = server.ownerId === userId;
  const targetIsOwner = server.ownerId === targetUserId;
  if (!isAbove(req.member!.role as Role, actorIsOwner, target.role as Role, targetIsOwner)) {
    throw new AppError('FORBIDDEN', 'Cannot unmute a member with equal or higher role', 403);
  }

  target.mutedUntil = null;
  await target.save();
  res.json({ member: target });
}

export async function promoteMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;
  const server = req.server!;

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const actorIsOwner = server.ownerId === userId;

  if (target.role === 'member') {
    // member → mod: requires admin+
    if (getRoleLevel(req.member!.role as Role, actorIsOwner) < getRoleLevel('admin', false)) {
      throw new AppError('FORBIDDEN', 'Admin access required to promote to mod', 403);
    }
    target.role = 'mod';
  } else if (target.role === 'mod') {
    // mod → admin: requires owner
    if (!actorIsOwner) {
      throw new AppError('FORBIDDEN', 'Only the owner can promote to admin', 403);
    }
    target.role = 'admin';
  } else {
    throw new AppError('CANNOT_PROMOTE', 'Cannot promote beyond admin', 400);
  }

  await target.save();
  res.json({ member: target });
}

export async function demoteMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;
  const server = req.server!;

  const target = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!target) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const actorIsOwner = server.ownerId === userId;
  const targetIsOwner = server.ownerId === targetUserId;

  if (targetIsOwner) {
    throw new AppError('CANNOT_DEMOTE', 'Cannot demote the server owner', 400);
  }

  if (target.role === 'admin') {
    // admin → mod: requires owner
    if (!actorIsOwner) {
      throw new AppError('FORBIDDEN', 'Only the owner can demote admins', 403);
    }
    target.role = 'mod';
  } else if (target.role === 'mod') {
    // mod → member: requires admin+
    if (getRoleLevel(req.member!.role as Role, actorIsOwner) < getRoleLevel('admin', false)) {
      throw new AppError('FORBIDDEN', 'Admin access required to demote mods', 403);
    }
    target.role = 'member';
  } else {
    throw new AppError('CANNOT_DEMOTE', 'Cannot demote below member', 400);
  }

  await target.save();
  res.json({ member: target });
}
