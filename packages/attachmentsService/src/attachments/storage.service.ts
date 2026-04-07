import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { STORAGE_PROVIDERS } from '../config/constants.js';
import { config } from '../config/index.js';
import { s3 } from '../config/storage.js';

const LOCAL_URL_TTL_SECONDS = 15 * 60;

interface LocalTokenPayload {
  attachmentId: string;
  exp: number;
}

function getStorageKey(originalname: string): string {
  const ext = originalname.split('.').pop() ?? '';
  return `${crypto.randomUUID()}.${ext}`;
}

function getLocalFilePath(storageKey: string): string {
  return path.join(config.local.storagePath, path.basename(storageKey));
}

function signTokenPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', config.local.urlSigningSecret)
    .update(encodedPayload)
    .digest('base64url');
}

function createLocalDownloadToken(attachmentId: string): string {
  const payload: LocalTokenPayload = {
    attachmentId,
    exp: Math.floor(Date.now() / 1000) + LOCAL_URL_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signTokenPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyLocalDownloadToken(token: string): string | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signTokenPayload(encodedPayload);
  const provided = Buffer.from(signature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as LocalTokenPayload;
    if (!payload.attachmentId || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.attachmentId;
  } catch {
    return null;
  }
}

export async function uploadToS3(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
  const storageKey = getStorageKey(file.originalname);

  await s3.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return storageKey;
}

export async function getPresignedUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
  });
  // @ts-expect-error — AWS SDK type incompatibility: S3Client vs presigner's Client (private 'handlers' differs under exactOptionalPropertyTypes)
  return getSignedUrl(s3, command, { expiresIn: 900 });
}

export async function deleteFromS3(storageKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: storageKey,
  }));
}

export async function uploadToStorage(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
  if (config.storageProvider === STORAGE_PROVIDERS.LOCAL) {
    const storageKey = getStorageKey(file.originalname);
    await writeFile(getLocalFilePath(storageKey), file.buffer);
    return storageKey;
  }

  return uploadToS3(file);
}

export async function getStorageUrl(attachmentId: string, storageKey: string): Promise<string> {
  if (config.storageProvider === STORAGE_PROVIDERS.LOCAL) {
    const token = createLocalDownloadToken(attachmentId);
    return `${config.local.publicBaseUrl}/attachments/public/${token}`;
  }

  return getPresignedUrl(storageKey);
}

export async function deleteFromStorage(storageKey: string): Promise<void> {
  if (config.storageProvider === STORAGE_PROVIDERS.LOCAL) {
    try {
      await unlink(getLocalFilePath(storageKey));
    } catch {
      // File can be already missing; DB delete should still succeed.
    }
    return;
  }

  await deleteFromS3(storageKey);
}

export async function readLocalStorageObject(storageKey: string): Promise<Buffer> {
  return readFile(getLocalFilePath(storageKey));
}
