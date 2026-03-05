import { client } from '@/client.ts';

import createUsers from './001_create_users.sql';
import createCredentials from './002_create_credentials.sql';
import createRefreshTokens from './003_create_refresh_tokens.sql';

(async () => {
  try {
    await client.connect();
    console.log('Connected to the database');

    // Your seed logic here
    await client.query(createUsers);
    await client.query(createCredentials);
    await client.query(createRefreshTokens);

    console.log('Database seeded successfully');

  } catch (err) {
    console.error('Error connecting to the database', err);
  } finally {
    await client.end();
  }
})();
