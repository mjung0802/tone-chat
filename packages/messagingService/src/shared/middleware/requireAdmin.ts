import type { Request, Response, NextFunction } from "express";
import { requireMember } from "./requireMember.js";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireMember(req, res, () => {
    if (!req.member) return; // requireMember already sent a response

    if (!req.member.roles.includes("admin")) {
      res
        .status(403)
        .json({
          error: {
            code: "FORBIDDEN",
            message: "Admin access required",
            status: 403,
          },
        });
      return;
    }

    next();
  });
}
