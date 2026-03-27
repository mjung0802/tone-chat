# auditLog/

- **auditLog.model.ts** — `IAuditLog` interface, `AuditAction` type, `AuditLog` Mongoose model, `logAuditEvent()` helper — fields: serverId, action, actorId, targetId, metadata, createdAt; index on serverId+createdAt
- **auditLog.controller.ts** — `listAuditLog()` — cursor-based pagination with `before` and `limit` query params
- **auditLog.routes.ts** — `auditLogRouter` — GET requires admin role
- **auditLog.controller.test.ts** — unit tests for audit log controller
