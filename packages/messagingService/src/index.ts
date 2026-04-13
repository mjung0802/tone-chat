import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { logger } from './shared/logger.js';

async function start(): Promise<void> {
  validateConfig();
  await connectDatabase();

  app.listen(config.port, () => {
    logger.info(`messagingService listening on port ${config.port}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start messagingService');
  process.exit(1);
});
