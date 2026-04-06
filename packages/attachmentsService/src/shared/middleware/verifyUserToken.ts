import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function verifyUserToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-user-token'] as string | undefined;
  if (!token) {
    res.status(401).json({ error: { code: 'MISSING_USER_TOKEN', message: 'Missing user token', status: 401 } });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_USER_TOKEN', message: 'Invalid or expired user token', status: 401 } });
  }
}
