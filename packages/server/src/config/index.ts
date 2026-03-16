export const config = {
  port: Number(process.env["PORT"] ?? 4000),
  jwtSecret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
  messagingServiceUrl:
    process.env["MESSAGING_SERVICE_URL"] ?? "http://localhost:3001",
  usersServiceUrl: process.env["USERS_SERVICE_URL"] ?? "http://localhost:3002",
  attachmentsServiceUrl:
    process.env["ATTACHMENTS_SERVICE_URL"] ?? "http://localhost:3003",
  internalApiKey: process.env["INTERNAL_API_KEY"] ?? "dev-internal-key",
  allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:8081")
    .split(",")
    .map((o) => o.trim()),
} as const;

const DEV_DEFAULTS = ["dev-secret-change-in-production", "dev-internal-key"];

export function validateConfig(): void {
  if (process.env["NODE_ENV"] !== "production") return;

  if (DEV_DEFAULTS.includes(config.jwtSecret)) {
    throw new Error("JWT_SECRET must be set in production");
  }
  if (DEV_DEFAULTS.includes(config.internalApiKey)) {
    throw new Error("INTERNAL_API_KEY must be set in production");
  }
}
