import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir } from 'node:fs/promises';
import { STORAGE_PROVIDERS } from './constants.js';
import { config } from './index.js';

export const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: true,
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
    console.log(`Created S3 bucket: ${config.s3.bucket}`);
  }
}

export async function ensureStorageReady(): Promise<void> {
  if (config.storageProvider === STORAGE_PROVIDERS.LOCAL) {
    await mkdir(config.local.storagePath, { recursive: true });
    return;
  }

  await ensureBucket();
}
