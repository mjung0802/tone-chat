# members/

- **members.client.ts** — `joinServer()`, `listMembers()`, `getMember()`, `updateMember()`, `removeMember()`, `muteMember()`, `unmuteMember()`, `promoteMember()`, `demoteMember()`, `banMember()` — proxies all member operations to messagingService
- **members.routes.ts** — `membersRouter` — CRUD + moderation routes; GET `/` enriches members with user data from usersService in batches of 100
- **members.routes.test.ts** — unit tests for members routes
