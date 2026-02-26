import { app } from './app.js';
import { config } from './config/index.js';
import { ensureBucket } from './config/storage.js';

async function start(): Promise<void> {
  await ensureBucket();

  app.listen(config.port, () => {
    console.log(`attachmentsService listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start attachmentsService:', err);
  process.exit(1);
});
