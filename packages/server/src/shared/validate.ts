import { z } from 'zod';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function validateBody(schema: z.ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const message = firstIssue?.message ?? 'Invalid request body';
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message, status: 400 } });
      return;
    }
    (req as { body: unknown }).body = result.data;
    next();
  };
}

// ─── Message schemas ───────────────────────────────────────────────────────────

export const createMessageSchema = z
  .object({
    content: z.string().min(1).max(4000).optional(),
    attachmentIds: z.array(z.string()).max(6).optional(),
    replyToId: z.string().min(1).optional(),
    mentions: z.array(z.string().max(36)).max(20).optional(),
    tone: z.string().min(1).max(50).optional(),
  })
  .refine(
    (d) => d.content !== undefined || (d.attachmentIds !== undefined && d.attachmentIds.length > 0),
    { message: 'content or attachmentIds required' },
  );

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

// ─── Server schemas ────────────────────────────────────────────────────────────

export const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const transferOwnershipSchema = z.object({
  userId: z.string().min(1),
});

export const addToneSchema = z.object({
  key: z.string().regex(/^[a-z0-9]{1,10}$/, 'key must match /^[a-z0-9]{1,10}$/'),
  label: z.string().min(1).max(50),
  emoji: z.string().min(1).max(10),
  colorLight: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colorLight must be a valid hex color'),
  colorDark: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colorDark must be a valid hex color'),
  textStyle: z.enum(['normal', 'italic', 'medium']).optional(),
});

export const updateInviteSettingsSchema = z.object({
  allowMemberInvites: z.boolean(),
});

// ─── Channel schemas ───────────────────────────────────────────────────────────

export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['text', 'voice']).optional(),
  topic: z.string().max(500).optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(500).optional(),
  position: z.number().int().min(0).optional(),
});
