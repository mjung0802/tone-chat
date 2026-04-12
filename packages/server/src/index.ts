import { createServer } from 'node:http';
import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { setupSocketIO } from './socket/index.js';
import { logger } from './shared/logger.js';

validateConfig();

const server = createServer(app);
setupSocketIO(server);

server.listen(config.port, () => {
  logger.info(`BFF server listening on port ${config.port}`);
});
