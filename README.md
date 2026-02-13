# tone-chat
A tone-based chat app

* Built on a Lerna monorepo utilizing pnpm
  - `pnpm install`
* Code is contained within `/packages` directory:
  - `/packages/client`: Client application to connect to servers, chat, manage profile, etc.
    - React Native for web/mobile compatibility
  - `/packages/server`: Server application to host chats, manage DB connection, etc.
    - Built on Express.js for web server management
    - Utilizes Socket.IO for WebSocket connection
