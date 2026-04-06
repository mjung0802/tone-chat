export const config = {
  port: Number(process.env['PORT'] ?? 3001),
  mongoUri: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/tone_messaging',
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  usersServiceUrl: process.env['USERS_SERVICE_URL'] ?? 'http://localhost:3002',
} as const;

export function validateConfig(): void {
  if (process.env['NODE_ENV'] !== 'production') return;

  if (config.internalApiKey === 'dev-internal-key') {
    throw new Error('INTERNAL_API_KEY must be set in production');
  }

  if (config.jwtSecret === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  if (config.usersServiceUrl === 'http://localhost:3002') {
    throw new Error('USERS_SERVICE_URL must be set in production');
  }
}
