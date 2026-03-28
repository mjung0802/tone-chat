import { Router } from 'express';
import { listAuditLog } from './auditLog.controller.js';
import { requireRole } from '../shared/middleware/requireRole.js';

export const auditLogRouter = Router({ mergeParams: true });
auditLogRouter.get('/', requireRole('admin'), listAuditLog);
