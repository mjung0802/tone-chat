export const config = {
  port: Number(process.env['PORT'] ?? 3001),
  mongoUri: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/tone_messaging',
  internalApiKey: process.env['INTERNAL_API_KEY'] ?? 'dev-internal-key',
} as const;
