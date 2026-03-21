# members/

- **serverMember.model.ts** — `IServerMember` interface, `ServerMember` Mongoose model — fields: serverId, userId, nickname, role (member/mod/admin), mutedUntil, joinedAt; unique index on serverId+userId
- **members.controller.ts** — `joinServer()`, `listMembers()`, `getMember()`, `updateMember()`, `removeMember()`, `muteMember()`, `unmuteMember()`, `promoteMember()`, `demoteMember()` — full role hierarchy enforcement; mute durations: 60/1440/10080 min
- **members.routes.ts** — `membersRouter` — POST (join) has no middleware; moderation routes require mod+; hierarchy checks enforced per action
- **members.controller.test.ts** — unit tests for member controller
