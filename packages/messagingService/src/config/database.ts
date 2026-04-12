import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../shared/logger.js';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  await mongoose.connection.syncIndexes();
  logger.info('Connected to MongoDB');
}
