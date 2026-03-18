import mongoose from 'mongoose';
import { config } from '../config/index.js';

async function migrateRoles() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const collection = db.collection('servermembers');

  // Migrate roles: ['admin'] → role: 'admin', roles: [] → role: 'member'
  const adminResult = await collection.updateMany(
    { roles: 'admin' },
    { $set: { role: 'admin', mutedUntil: null }, $unset: { roles: '' } },
  );
  console.log(`Migrated ${adminResult.modifiedCount} admin members`);

  const memberResult = await collection.updateMany(
    { roles: { $exists: true }, role: { $exists: false } },
    { $set: { role: 'member', mutedUntil: null }, $unset: { roles: '' } },
  );
  console.log(`Migrated ${memberResult.modifiedCount} regular members`);

  // Catch any remaining docs without role field
  const remainingResult = await collection.updateMany(
    { role: { $exists: false } },
    { $set: { role: 'member', mutedUntil: null }, $unset: { roles: '' } },
  );
  console.log(`Migrated ${remainingResult.modifiedCount} remaining members`);

  await mongoose.disconnect();
  console.log('Migration complete');
}

migrateRoles().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
