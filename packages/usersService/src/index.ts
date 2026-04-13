import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { sendTestEmail } from './email/email.service.js';
import { logger } from './shared/logger.js';

validateConfig();

app.listen(config.port, () => {
  logger.info(`usersService listening on port ${config.port}`);

  // Send test email on startup (non-blocking)
  sendTestEmail().catch((err: unknown) => {
    logger.error({ err }, 'Startup test email failed');
  });
});
