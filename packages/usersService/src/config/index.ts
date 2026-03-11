export const config = {
  port: Number(process.env['PORT'] ?? 3002),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgres://tone:tone_dev@localhost:5432/tone_users',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  jwtAccessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  jwtRefreshExpiresDays: Number(process.env['JWT_REFRESH_EXPIRES_DAYS'] ?? 7),
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
  smtpHost: process.env['SMTP_HOST'] ?? '',
  smtpPort: Number(process.env['SMTP_PORT'] ?? 587),
  smtpUser: process.env['SMTP_USER'] ?? '',
  smtpPass: process.env['SMTP_PASS'] ?? '',
  smtpFrom: process.env['SMTP_FROM'] ?? 'noreply@tone-chat.dev',
} as const;

const DEV_DEFAULTS = ['dev-secret-change-in-production', 'dev-internal-key'];

export function validateConfig(): void {
  if (process.env['NODE_ENV'] !== 'production') return;

  if (DEV_DEFAULTS.includes(config.jwtSecret)) {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (DEV_DEFAULTS.includes(config.internalApiKey)) {
    throw new Error('INTERNAL_API_KEY must be set in production');
  }
  if (!config.smtpHost) {
    throw new Error('SMTP_HOST must be set in production');
  }
}
