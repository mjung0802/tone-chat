import { Router } from "express";
import { getMe, patchMe, getUser, getUsersBatch } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", getMe);
usersRouter.patch("/me", patchMe);
usersRouter.post("/batch", getUsersBatch);
usersRouter.get("/:id", getUser);
