import type { Request, Response } from 'express';
import { ServerMember } from './serverMember.model.js';
import { Server } from '../servers/server.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';

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
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;

  // Check if requester is admin
  const requester = await ServerMember.findOne({ serverId, userId });
  if (!requester?.roles.includes('admin')) {
    throw new AppError('FORBIDDEN', 'Only admins can update members', 403);
  }

  const member = await ServerMember.findOne({ serverId, userId: targetUserId });
  if (!member) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  const { nickname, roles } = req.body as { nickname?: string; roles?: string[] };
  if (nickname !== undefined) member.nickname = nickname;
  if (roles !== undefined) member.roles = roles;

  await member.save();
  res.json({ member });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId } = req.params;
  const targetUserId = req.params['userId']!;

  // Allow self-leave or admin kick
  if (targetUserId !== userId) {
    const requester = await ServerMember.findOne({ serverId, userId });
    if (!requester?.roles.includes('admin')) {
      throw new AppError('FORBIDDEN', 'Only admins can kick members', 403);
    }
  }

  const result = await ServerMember.findOneAndDelete({ serverId, userId: targetUserId });
  if (!result) {
    throw new AppError('MEMBER_NOT_FOUND', 'Member not found', 404);
  }

  res.status(204).end();
}
