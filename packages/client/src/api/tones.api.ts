import { get, post, del } from './client';
import type { CustomTonesResponse, CustomToneResponse, AddCustomToneRequest } from '../types/api.types';

export function getCustomTones(serverId: string) {
  return get<CustomTonesResponse>(`/servers/${serverId}/tones`);
}

export function addCustomTone(serverId: string, data: AddCustomToneRequest) {
  return post<CustomToneResponse>(`/servers/${serverId}/tones`, data);
}

export function removeCustomTone(serverId: string, toneKey: string) {
  return del(`/servers/${serverId}/tones/${toneKey}`);
}
