# channels/

- **channel.model.ts** — `IChannel` interface, `Channel` Mongoose model — fields: serverId, name, type, topic, position; indexed on serverId+position
- **channels.controller.ts** — `createChannel()`, `listChannels()`, `getChannel()`, `updateChannel()`, `deleteChannel()` — auto-increments position on create
- **channels.routes.ts** — `channelsRouter` — POST/GET require member; PATCH/DELETE require admin
- **channels.controller.test.ts** — unit tests for channel controller
