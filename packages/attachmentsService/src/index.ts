import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { ensureStorageReady } from './config/storage.js';

async function start(): Promise<void> {
  validateConfig();
  await ensureStorageReady();

  app.listen(config.port, () => {
    console.log(`attachmentsService listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start attachmentsService:', err);
  process.exit(1);
});
