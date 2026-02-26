export const config = {
  port: Number(process.env['PORT'] ?? 4000),
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  messagingServiceUrl: process.env['MESSAGING_SERVICE_URL'] ?? 'http://localhost:3001',
  usersServiceUrl: process.env['USERS_SERVICE_URL'] ?? 'http://localhost:3002',
  attachmentsServiceUrl: process.env['ATTACHMENTS_SERVICE_URL'] ?? 'http://localhost:3003',
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
} as const;
