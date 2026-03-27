import { get } from './client';
import type { AuditLogResponse, AuditLogQuery } from '../types/api.types';

export function getAuditLog(serverId: string, query?: AuditLogQuery) {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.before) params.set('before', query.before);
  const qs = params.toString();
  return get<AuditLogResponse>(`/servers/${serverId}/audit-log${qs ? `?${qs}` : ''}`);
}
