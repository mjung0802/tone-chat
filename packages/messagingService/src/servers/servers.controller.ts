import type { Request, Response } from "express";
import { Server } from "./server.model.js";
import { Channel } from "../channels/channel.model.js";
import { ServerMember } from "../members/serverMember.model.js";
import { AppError } from "../shared/middleware/errorHandler.js";

export async function createServer(req: Request, res: Response): Promise<void> {
  const userId = req.headers["x-user-id"] as string;
  const { name, description, visibility } = req.body as {
    name: string;
    description?: string;
    visibility?: string;
  };

  if (!name) {
    res
      .status(400)
      .json({
        error: {
          code: "MISSING_FIELDS",
          message: "name is required",
          status: 400,
        },
      });
    return;
  }

  const server = await Server.create({
    name,
    ownerId: userId,
    description,
    visibility,
  });

  // Auto-create #general channel
  await Channel.create({
    serverId: server._id,
    name: "general",
    type: "text",
    position: 0,
  });

  // Add owner as member with admin role
  await ServerMember.create({ serverId: server._id, userId, roles: ["admin"] });

  res.status(201).json({ server });
}

export async function getServer(req: Request, res: Response): Promise<void> {
  const server = await Server.findById(req.params["serverId"]);
  if (!server) {
    throw new AppError("SERVER_NOT_FOUND", "Server not found", 404);
  }
  res.json({ server });
}

export async function listServers(req: Request, res: Response): Promise<void> {
  const userId = req.headers["x-user-id"] as string;

  // Return servers the user is a member of
  const memberships = await ServerMember.find({ userId }).select("serverId");
  const serverIds = memberships.map((m) => m.serverId);
  const servers = await Server.find({ _id: { $in: serverIds } }).sort({
    createdAt: -1,
  });

  res.json({ servers });
}

export async function updateServer(req: Request, res: Response): Promise<void> {
  const userId = req.headers["x-user-id"] as string;
  const server = await Server.findById(req.params["serverId"]);

  if (!server) {
    throw new AppError("SERVER_NOT_FOUND", "Server not found", 404);
  }
  if (server.ownerId !== userId) {
    throw new AppError(
      "FORBIDDEN",
      "Only the server owner can update the server",
      403,
    );
  }

  const { name, description, icon, visibility } = req.body as Record<
    string,
    string | undefined
  >;
  if (name !== undefined) server.name = name;
  if (description !== undefined) server.description = description;
  if (icon !== undefined) server.icon = icon;
  if (visibility !== undefined)
    server.visibility = visibility as "public" | "private";

  await server.save();
  res.json({ server });
}

export async function deleteServer(req: Request, res: Response): Promise<void> {
  const userId = req.headers["x-user-id"] as string;
  const server = await Server.findById(req.params["serverId"]);

  if (!server) {
    throw new AppError("SERVER_NOT_FOUND", "Server not found", 404);
  }
  if (server.ownerId !== userId) {
    throw new AppError(
      "FORBIDDEN",
      "Only the server owner can delete the server",
      403,
    );
  }

  await server.deleteOne();
  res.status(204).end();
}
