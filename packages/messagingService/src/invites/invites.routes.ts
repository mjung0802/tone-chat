import { Router } from "express";
import {
  createInvite,
  listInvites,
  revokeInvite,
  joinViaInvite,
} from "./invites.controller.js";
import { requireAdmin } from "../shared/middleware/requireAdmin.js";

// Server-scoped invite routes
export const invitesRouter = Router({ mergeParams: true });

invitesRouter.post("/", requireAdmin, createInvite);
invitesRouter.get("/", requireAdmin, listInvites);
invitesRouter.delete("/:code", requireAdmin, revokeInvite);

// Top-level join route (separate router)
export const joinRouter = Router();

joinRouter.post("/:code/join", joinViaInvite);
