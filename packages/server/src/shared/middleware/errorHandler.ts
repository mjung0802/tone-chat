import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('BFF error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } });
}
