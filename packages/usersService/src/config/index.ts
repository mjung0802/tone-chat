export const config = {
  port: Number(process.env['PORT'] ?? 3002),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgres://tone:tone_dev@localhost:5432/tone_users',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  jwtAccessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  jwtRefreshExpiresDays: Number(process.env['JWT_REFRESH_EXPIRES_DAYS'] ?? 7),
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
} as const;
