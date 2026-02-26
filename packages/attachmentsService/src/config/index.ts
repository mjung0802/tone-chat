export const config = {
  port: Number(process.env['PORT'] ?? 3003),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgres://tone:tone_dev@localhost:5433/tone_attachments',
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
  s3: {
    endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9000',
    bucket: process.env['S3_BUCKET'] ?? 'tone-attachments',
    accessKey: process.env['S3_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: process.env['S3_SECRET_KEY'] ?? 'minioadmin',
    region: process.env['S3_REGION'] ?? 'us-east-1',
  },
} as const;
