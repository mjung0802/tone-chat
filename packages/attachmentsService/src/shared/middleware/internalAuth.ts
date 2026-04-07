import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config/index.js';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'];
  if (key !== config.internalApiKey) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid internal API key', status: 401 } });
    return;
  }
  next();
}

export function requireInternalUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'Missing X-User-Id header', status: 400 } });
    return;
  }
  next();
}
