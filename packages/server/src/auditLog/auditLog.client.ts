import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function listAuditLog(userId: string, serverId: string, query?: { limit?: number; before?: string }) {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.before) params.set('before', query.before);
  const qs = params.toString();
  return serviceRequest(base(), `/servers/${serverId}/audit-log${qs ? `?${qs}` : ''}`, { userId });
}
