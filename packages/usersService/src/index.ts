import { app } from './app.js';
import { config, validateConfig } from './config/index.js';
import { sendTestEmail } from './email/email.service.js';

validateConfig();

app.listen(config.port, () => {
  console.log(`usersService listening on port ${config.port}`);
  
  // Send test email on startup (non-blocking)
  sendTestEmail().catch((err: unknown) => {
    console.error('[STARTUP] Test email failed:', err);
  });
});
