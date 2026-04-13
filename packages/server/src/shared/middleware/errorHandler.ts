import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';

export function errorHandler(err: unknown, _req: Request, res: Response, __next: NextFunction): void {
  void __next;
  logger.error({ err }, 'BFF error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } });
}
