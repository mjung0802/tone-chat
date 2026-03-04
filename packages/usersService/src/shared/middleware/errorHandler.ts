import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, status: err.status } });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } });
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
