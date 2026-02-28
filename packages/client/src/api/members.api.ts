import { get, post, patch, del } from './client';
import type { MemberResponse, MembersResponse, UpdateMemberRequest } from '../types/api.types';

export function getMembers(serverId: string) {
  return get<MembersResponse>(`/servers/${serverId}/members`);
}

export function getMember(serverId: string, userId: string) {
  return get<MemberResponse>(`/servers/${serverId}/members/${userId}`);
}

export function joinServer(serverId: string) {
  return post<MemberResponse>(`/servers/${serverId}/members`);
}

export function updateMember(serverId: string, userId: string, data: UpdateMemberRequest) {
  return patch<MemberResponse>(`/servers/${serverId}/members/${userId}`, data);
}

export function removeMember(serverId: string, userId: string) {
  return del(`/servers/${serverId}/members/${userId}`);
}
