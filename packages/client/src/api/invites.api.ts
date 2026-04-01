import { get, post, del } from './client';
import type {
  InviteResponse,
  InvitesResponse,
  CreateInviteRequest,
  JoinInviteResponse,
} from '../types/api.types';

export function getInvites(serverId: string) {
  return get<InvitesResponse>(`/servers/${serverId}/invites`);
}

export function getDefaultInvite(serverId: string) {
  return get<InviteResponse>(`/servers/${serverId}/invites/default`);
}

export function createInvite(serverId: string, data?: CreateInviteRequest) {
  return post<InviteResponse>(`/servers/${serverId}/invites`, data);
}

export function revokeInvite(serverId: string, code: string) {
  return del<InviteResponse>(`/servers/${serverId}/invites/${code}`);
}

export function joinViaCode(code: string) {
  return post<JoinInviteResponse>(`/invites/${code}/join`);
}
