import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { ensureBucket } from './config/storage.js';
import { logger } from './shared/logger.js';

async function start(): Promise<void> {
  validateConfig();
  await ensureBucket();

  app.listen(config.port, () => {
    logger.info(`attachmentsService listening on port ${config.port}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start attachmentsService');
  process.exit(1);
});
