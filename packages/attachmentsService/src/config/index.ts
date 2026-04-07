import { STORAGE_PROVIDERS, type StorageProvider } from './constants.js';

function parseStorageProvider(value: string | undefined): StorageProvider {
  return value === STORAGE_PROVIDERS.LOCAL ? STORAGE_PROVIDERS.LOCAL : STORAGE_PROVIDERS.S3;
}

export const config = {
  port: Number(process.env['PORT'] ?? 3003),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgres://tone:tone_dev@localhost:5433/tone_attachments',
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
  storageProvider: parseStorageProvider(process.env['ATTACHMENTS_STORAGE_PROVIDER']),
  local: {
    storagePath: process.env['ATTACHMENTS_LOCAL_STORAGE_PATH'] ?? './storage/attachments',
    publicBaseUrl: (process.env['ATTACHMENTS_PUBLIC_BASE_URL'] ?? 'http://localhost:4000/api/v1').replace(/\/$/, ''),
    urlSigningSecret: process.env['ATTACHMENTS_URL_SIGNING_SECRET'] ?? process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
  },
  s3: {
    endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9000',
    bucket: process.env['S3_BUCKET'] ?? 'tone-attachments',
    accessKey: process.env['S3_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: process.env['S3_SECRET_KEY'] ?? 'minioadmin',
    region: process.env['S3_REGION'] ?? 'us-east-1',
  },
} as const;

const DEV_DEFAULTS = ['dev-internal-key', 'minioadmin'];

export function validateConfig(): void {
  if (process.env['NODE_ENV'] !== 'production') return;

  if (config.internalApiKey === 'dev-internal-key') {
    throw new Error('INTERNAL_API_KEY must be set in production');
  }
  if (config.storageProvider === STORAGE_PROVIDERS.S3) {
    if (DEV_DEFAULTS.includes(config.s3.accessKey)) {
      throw new Error('S3_ACCESS_KEY must be set in production when ATTACHMENTS_STORAGE_PROVIDER=s3');
    }
    if (DEV_DEFAULTS.includes(config.s3.secretKey)) {
      throw new Error('S3_SECRET_KEY must be set in production when ATTACHMENTS_STORAGE_PROVIDER=s3');
    }
  }

  if (config.storageProvider === STORAGE_PROVIDERS.LOCAL) {
    if (!config.local.publicBaseUrl) {
      throw new Error('ATTACHMENTS_PUBLIC_BASE_URL must be set in production when ATTACHMENTS_STORAGE_PROVIDER=local');
    }
    if (!config.local.urlSigningSecret || config.local.urlSigningSecret === 'dev-internal-key') {
      throw new Error('ATTACHMENTS_URL_SIGNING_SECRET (or INTERNAL_API_KEY) must be set in production when ATTACHMENTS_STORAGE_PROVIDER=local');
    }
  }
}
