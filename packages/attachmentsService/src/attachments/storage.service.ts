import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../config/storage.js';
import { config } from '../config/index.js';
import crypto from 'node:crypto';

export async function uploadToS3(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
  const ext = file.originalname.split('.').pop() ?? '';
  const storageKey = `${crypto.randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return storageKey;
}

export async function getFromS3(storageKey: string) {
  const result = await s3.send(new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
  }));
  return result;
}

export async function getPresignedUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
  });
  // @ts-expect-error — AWS SDK type incompatibility: S3Client vs presigner's Client (private 'handlers' differs under exactOptionalPropertyTypes)
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
