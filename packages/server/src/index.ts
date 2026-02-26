import { createServer } from 'node:http';
import { app } from './app.js';
import { config } from './config/index.js';
import { setupSocketIO } from './socket/index.js';

const server = createServer(app);
setupSocketIO(server);

server.listen(config.port, () => {
  console.log(`BFF server listening on port ${config.port}`);
});
