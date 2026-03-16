import type { Request, Response } from "express";
import { Channel } from "./channel.model.js";
import { AppError } from "../shared/middleware/errorHandler.js";

export async function createChannel(
  req: Request,
  res: Response,
): Promise<void> {
  const { serverId } = req.params;
  const { name, type, topic } = req.body as {
    name: string;
    type?: string;
    topic?: string;
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

  const maxPos = await Channel.findOne({ serverId })
    .sort({ position: -1 })
    .select("position");
  const position = maxPos ? maxPos.position + 1 : 0;

  const channel = await Channel.create({
    serverId,
    name,
    type: type ?? "text",
    topic,
    position,
  });
  res.status(201).json({ channel });
}

export async function listChannels(req: Request, res: Response): Promise<void> {
  const channels = await Channel.find({
    serverId: req.params["serverId"],
  }).sort({ position: 1 });
  res.json({ channels });
}

export async function getChannel(req: Request, res: Response): Promise<void> {
  const channel = await Channel.findOne({
    _id: req.params["channelId"],
    serverId: req.params["serverId"],
  });
  if (!channel) {
    throw new AppError("CHANNEL_NOT_FOUND", "Channel not found", 404);
  }
  res.json({ channel });
}

export async function updateChannel(
  req: Request,
  res: Response,
): Promise<void> {
  const channel = await Channel.findOne({
    _id: req.params["channelId"],
    serverId: req.params["serverId"],
  });
  if (!channel) {
    throw new AppError("CHANNEL_NOT_FOUND", "Channel not found", 404);
  }

  const { name, topic, position } = req.body as {
    name?: string;
    topic?: string;
    position?: number;
  };
  if (name !== undefined) channel.name = name;
  if (topic !== undefined) channel.topic = topic;
  if (position !== undefined) channel.position = position;

  await channel.save();
  res.json({ channel });
}

export async function deleteChannel(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await Channel.findOneAndDelete({
    _id: req.params["channelId"],
    serverId: req.params["serverId"],
  });
  if (!result) {
    throw new AppError("CHANNEL_NOT_FOUND", "Channel not found", 404);
  }
  res.status(204).end();
}
