import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'];
  if (key !== config.internalApiKey) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid internal API key', status: 401 } });
    return;
  }
  next();
}
