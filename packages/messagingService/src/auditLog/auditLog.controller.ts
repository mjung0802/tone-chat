import type { Request, Response } from 'express';
import { AuditLog } from './auditLog.model.js';

export async function listAuditLog(req: Request, res: Response): Promise<void> {
  const { serverId } = req.params;
  const limit = Math.min(Number(req.query['limit'] ?? 50), 100);
  const before = req.query['before'];

  const filter: Record<string, unknown> = { serverId };
  if (before && typeof before === 'string') {
    filter['_id'] = { $lt: before };
  }

  const entries = await AuditLog.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit);

  res.json({ entries });
}
