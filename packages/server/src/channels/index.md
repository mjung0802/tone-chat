# channels/

- **channels.client.ts** — `createChannel()`, `listChannels()`, `getChannel()`, `updateChannel()`, `deleteChannel()` — proxies all channel CRUD to messagingService
- **channels.routes.ts** — `channelsRouter` — full CRUD routes for channels; POST and PATCH validate request bodies via `validateBody(createChannelSchema)` and `validateBody(updateChannelSchema)`
