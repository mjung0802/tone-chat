import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

async function migrateRoles() {
  await mongoose.connect(config.mongoUri);
  logger.info('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const collection = db.collection('servermembers');

  // Migrate roles: ['admin'] → role: 'admin', roles: [] → role: 'member'
  const adminResult = await collection.updateMany(
    { roles: 'admin' },
    { $set: { role: 'admin', mutedUntil: null }, $unset: { roles: '' } },
  );
  logger.info(`Migrated ${adminResult.modifiedCount} admin members`);

  const memberResult = await collection.updateMany(
    { roles: { $exists: true }, role: { $exists: false } },
    { $set: { role: 'member', mutedUntil: null }, $unset: { roles: '' } },
  );
  logger.info(`Migrated ${memberResult.modifiedCount} regular members`);

  // Catch any remaining docs without role field
  const remainingResult = await collection.updateMany(
    { role: { $exists: false } },
    { $set: { role: 'member', mutedUntil: null }, $unset: { roles: '' } },
  );
  logger.info(`Migrated ${remainingResult.modifiedCount} remaining members`);

  await mongoose.disconnect();
  logger.info('Migration complete');
}

migrateRoles().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
