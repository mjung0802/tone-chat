import { Router } from "express";
import type { AuthRequest } from "../shared/middleware/auth.js";
import * as client from "./members.client.js";
import * as usersClient from "../users/users.client.js";

export const membersRouter = Router({ mergeParams: true });

membersRouter.post("/", async (req: AuthRequest, res) => {
  const result = await client.joinServer(
    req.userId!,
    req.params["serverId"] as string,
  );
  res.status(result.status).json(result.data);
});

membersRouter.get("/", async (req: AuthRequest, res) => {
  const result = await client.listMembers(
    req.userId!,
    req.params["serverId"] as string,
  );
  if (result.status !== 200) {
    res.status(result.status).json(result.data);
    return;
  }
  const { members } = result.data as {
    members: Array<Record<string, unknown>>;
  };
  const userIds = members.map((m) => m.userId as string);
  if (userIds.length > 0) {
    const BATCH_SIZE = 100;
    const userMap = new Map<
      string,
      {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }
    >();
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const usersResult = await usersClient.getUsersBatch(req.userId!, batch);
      if (usersResult.status === 200) {
        const { users } = usersResult.data as {
          users: Array<{
            id: string;
            username: string;
            display_name: string | null;
            avatar_url: string | null;
          }>;
        };
        for (const u of users) {
          userMap.set(u.id, u);
        }
      }
    }
    for (const member of members) {
      const user = userMap.get(member.userId as string);
      if (user) {
        member.username = user.username;
        member.display_name = user.display_name;
        member.avatar_url = user.avatar_url;
      }
    }
  }
  res.json({ members });
});

membersRouter.get("/:userId", async (req: AuthRequest, res) => {
  const result = await client.getMember(
    req.userId!,
    req.params["serverId"] as string,
    req.params["userId"] as string,
  );
  res.status(result.status).json(result.data);
});

membersRouter.patch("/:userId", async (req: AuthRequest, res) => {
  const result = await client.updateMember(
    req.userId!,
    req.params["serverId"] as string,
    req.params["userId"] as string,
    req.body as Record<string, unknown>,
  );
  res.status(result.status).json(result.data);
});

membersRouter.delete("/:userId", async (req: AuthRequest, res) => {
  const result = await client.removeMember(
    req.userId!,
    req.params["serverId"] as string,
    req.params["userId"] as string,
  );
  res.status(result.status).end();
});
