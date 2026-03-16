import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  __next: NextFunction,
): void {
  void __next;
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({
        error: { code: err.code, message: err.message, status: err.status },
      });
    return;
  }

  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        status: 500,
      },
    });
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
