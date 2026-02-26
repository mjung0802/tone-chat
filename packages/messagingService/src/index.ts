import { app } from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';

async function start(): Promise<void> {
  await connectDatabase();

  app.listen(config.port, () => {
    console.log(`messagingService listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start messagingService:', err);
  process.exit(1);
});
