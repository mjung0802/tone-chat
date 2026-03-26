# socket/

- **index.ts** — `setupSocketIO()` — configures Socket.IO with JWT auth middleware, connection recovery; manages `join_channel`/`leave_channel` with membership verification; registers message handlers (`registerMessageHandlers`) and DM handlers (`registerDmHandlers`); calls `setIO` and `setDmIO` to inject the io instance into route modules
