# users/

- **users.service.ts** — `getUsersByIds()`, `getUserById()`, `updateUser()` — allowlisted update fields: display_name, pronouns, avatar_url, bio, status
- **users.controller.ts** — `getMe()`, `patchMe()`, `getUsersBatch()` (max 100), `getUser()` — strips email before all returns
- **users.routes.ts** — `usersRouter` — GET `/me`, PATCH `/me`, POST `/batch`, GET `/:id`
- **users.controller.test.ts** / **users.service.test.ts** — unit tests
- **users.integration.test.ts** — integration tests
