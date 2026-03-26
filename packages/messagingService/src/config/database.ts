import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  await mongoose.connection.syncIndexes();
  console.log('Connected to MongoDB');
}
