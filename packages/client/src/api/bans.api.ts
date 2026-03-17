import { get, del } from './client';
import type { BansResponse } from '../types/api.types';

export function getBans(serverId: string) {
  return get<BansResponse>(`/servers/${serverId}/bans`);
}

export function unbanUser(serverId: string, userId: string) {
  return del(`/servers/${serverId}/bans/${userId}`);
}
