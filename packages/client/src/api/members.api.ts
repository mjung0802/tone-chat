import { get, post, patch, del } from './client';
import type { MemberResponse, MembersResponse, UpdateMemberRequest, MuteMemberRequest, BanMemberRequest } from '../types/api.types';

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

export function muteMember(serverId: string, userId: string, data: MuteMemberRequest) {
  return post<MemberResponse>(`/servers/${serverId}/members/${userId}/mute`, data);
}

export function unmuteMember(serverId: string, userId: string) {
  return del<MemberResponse>(`/servers/${serverId}/members/${userId}/mute`);
}

export function promoteMember(serverId: string, userId: string) {
  return post<MemberResponse>(`/servers/${serverId}/members/${userId}/promote`);
}

export function demoteMember(serverId: string, userId: string) {
  return post<MemberResponse>(`/servers/${serverId}/members/${userId}/demote`);
}

export function banMember(serverId: string, userId: string, data: BanMemberRequest) {
  return post(`/servers/${serverId}/members/${userId}/ban`, data);
}
