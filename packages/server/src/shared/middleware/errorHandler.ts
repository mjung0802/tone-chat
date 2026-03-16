import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  __next: NextFunction,
): void {
  void __next;
  console.error("BFF error:", err);
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
