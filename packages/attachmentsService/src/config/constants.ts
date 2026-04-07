export const STORAGE_PROVIDERS = {
  S3: 's3',
  LOCAL: 'local',
} as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[keyof typeof STORAGE_PROVIDERS];
