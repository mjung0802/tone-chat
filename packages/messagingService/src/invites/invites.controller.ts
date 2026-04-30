import type { Request, Response } from 'express';
import { Invite } from './invite.model.js';
import { Server } from '../servers/server.model.js';
import { ServerMember } from '../members/serverMember.model.js';
import { ServerBan } from '../bans/serverBan.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { getRoleLevel, type Role } from '../shared/roles.js';

export async function getDefaultInvite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { serverId } = req.params as { serverId: string };

  const [server, existingInvite] = await Promise.all([
    Server.findById(serverId),
    Invite.findOne({
      serverId,
      revoked: false,
      expiresAt: { $exists: false },
      maxUses: { $exists: false },
    }),
  ]);

  if (!server) {
    throw new AppError('SERVER_NOT_FOUND', 'Server not found', 404);
  }

  if (!server.allowMemberInvites) {
    const isOwner = server.ownerId === userId;
    const memberLevel = getRoleLevel((req.member!.role ?? 'member') as Role, isOwner);
    if (memberLevel < getRoleLevel('admin', false)) {
      throw new AppError('FORBIDDEN', 'Only admins can create invites when member invites are disabled', 403);
    }
  }

  const invite = existingInvite ?? await Invite.create({ serverId, createdBy: userId });

  res.json({ invite });
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { serverId } = req.params;
  const { maxUses, expiresIn } = req.body as { maxUses?: number; expiresIn?: number };

  // Verify user is a member
  const member = await ServerMember.findOne({ serverId, userId });
  if (!member) {
    throw new AppError('NOT_MEMBER', 'You must be a member to create invites', 403);
  }

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

  const invite = await Invite.create({
    serverId,
    createdBy: userId,
    maxUses,
    expiresAt,
  });

  res.status(201).json({ invite });
}

export async function listInvites(req: Request, res: Response): Promise<void> {
  const invites = await Invite.find({ serverId: req.params['serverId'], revoked: false }, null, { limit: 100 });
  res.json({ invites });
}

export async function revokeInvite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { serverId, code } = req.params;

  // Only admins or owner can revoke
  const server = await Server.findById(serverId);
  if (!server) {
    throw new AppError('SERVER_NOT_FOUND', 'Server not found', 404);
  }

  const member = await ServerMember.findOne({ serverId, userId });
  const isOwner = server.ownerId === userId;
  const memberLevel = getRoleLevel((member?.role ?? 'member') as Role, isOwner);
  if (memberLevel < getRoleLevel('admin', false)) {
    throw new AppError('FORBIDDEN', 'Only admins can revoke invites', 403);
  }

  const invite = await Invite.findOneAndUpdate(
    { serverId, code, revoked: false },
    { revoked: true },
    { new: true },
  );

  if (!invite) {
    throw new AppError('INVITE_NOT_FOUND', 'Invite not found', 404);
  }

  res.json({ invite });
}

export async function getInviteStatus(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { code } = req.params as { code: string };

  const invite = await Invite.findOne({ code });
  if (!invite) {
    res.json({
      code,
      serverId: '',
      serverName: '',
      status: 'not-found',
      alreadyMember: false,
      banned: false,
    });
    return;
  }

  let status: 'valid' | 'revoked' | 'expired' | 'exhausted';
  if (invite.revoked) {
    status = 'revoked';
  } else if (invite.expiresAt && invite.expiresAt < new Date()) {
    status = 'expired';
  } else if (invite.maxUses && invite.uses >= invite.maxUses) {
    status = 'exhausted';
  } else {
    status = 'valid';
  }

  const [server, member, ban] = await Promise.all([
    Server.findById(invite.serverId),
    ServerMember.findOne({ serverId: invite.serverId, userId }),
    ServerBan.findOne({ serverId: invite.serverId, userId }),
  ]);

  res.json({
    code: invite.code,
    serverId: invite.serverId.toString(),
    serverName: server?.name ?? '',
    status,
    alreadyMember: !!member,
    banned: !!ban,
  });
}

export async function joinViaInvite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { code } = req.params;

  const invite = await Invite.findOne({ code });
  if (!invite) {
    throw new AppError('INVITE_NOT_FOUND', 'Invalid invite code', 404);
  }

  if (invite.revoked) {
    throw new AppError('INVITE_REVOKED', 'This invite has been revoked', 410);
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new AppError('INVITE_EXPIRED', 'This invite has expired', 410);
  }

  if (invite.maxUses && invite.uses >= invite.maxUses) {
    throw new AppError('INVITE_EXHAUSTED', 'This invite has reached its maximum uses', 410);
  }

  const ban = await ServerBan.findOne({ serverId: invite.serverId, userId });
  if (ban) {
    throw new AppError('BANNED', 'You are banned from this server', 403);
  }

  const existing = await ServerMember.findOne({ serverId: invite.serverId, userId });
  if (existing) {
    throw new AppError('ALREADY_MEMBER', 'You are already a member of this server', 409);
  }

  const member = await ServerMember.create({ serverId: invite.serverId, userId });
  invite.uses += 1;
  await invite.save();

  const server = await Server.findById(invite.serverId);

  res.status(201).json({ member, server });
}
