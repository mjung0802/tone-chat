import { Router } from "express";
import {
  joinServer,
  listMembers,
  getMember,
  updateMember,
  removeMember,
} from "./members.controller.js";
import { requireMember } from "../shared/middleware/requireMember.js";
import { requireAdmin } from "../shared/middleware/requireAdmin.js";

export const membersRouter = Router({ mergeParams: true });

membersRouter.post("/", joinServer); // No middleware — user isn't a member yet
membersRouter.get("/", requireMember, listMembers);
membersRouter.get("/:userId", requireMember, getMember);
membersRouter.patch("/:userId", requireAdmin, updateMember);
membersRouter.delete("/:userId", requireMember, removeMember); // Self-leave or admin kick (checked in controller)
