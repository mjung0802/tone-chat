import { client } from '../client.js';
import { logger } from '../shared/logger.js';

(async () => {
  try {
    await client.connect();
    logger.info('Connected to the database');

    // Your seed logic here

  } catch (err) {
    logger.error({ err }, 'Error connecting to the database');
  } finally {
    await client.end();
  }
})();
