import { Router } from "express";
import type { AuthRequest } from "../shared/middleware/auth.js";
import * as client from "./invites.client.js";

// Server-scoped invite routes
export const serverInvitesRouter = Router({ mergeParams: true });

serverInvitesRouter.post("/", async (req: AuthRequest, res) => {
  const result = await client.createInvite(
    req.userId!,
    req.params["serverId"] as string,
    req.body as Record<string, unknown>,
  );
  res.status(result.status).json(result.data);
});

serverInvitesRouter.get("/", async (req: AuthRequest, res) => {
  const result = await client.listInvites(
    req.userId!,
    req.params["serverId"] as string,
  );
  res.status(result.status).json(result.data);
});

serverInvitesRouter.delete("/:code", async (req: AuthRequest, res) => {
  const result = await client.revokeInvite(
    req.userId!,
    req.params["serverId"] as string,
    req.params["code"] as string,
  );
  res.status(result.status).json(result.data);
});

// Top-level join route
export const joinRouter = Router();

joinRouter.post("/:code/join", async (req: AuthRequest, res) => {
  const result = await client.joinViaInvite(
    req.userId!,
    req.params["code"] as string,
  );
  res.status(result.status).json(result.data);
});
