import { get, post, patch, put, del } from './client';
import type {
  BlockedIdsResponse,
  DirectConversationResponse,
  DirectConversationsResponse,
  DirectMessageResponse,
  DirectMessagesResponse,
  MessagesQuery,
  SendDmRequest,
  ToggleDmReactionRequest,
  UpdateDmRequest,
} from '../types/api.types';

export function getOrCreateConversation(otherUserId: string) {
  return post<DirectConversationResponse>(`/dms/${otherUserId}`, {});
}

export function listConversations() {
  return get<DirectConversationsResponse>('/dms');
}

export function getConversation(conversationId: string) {
  return get<DirectConversationResponse>(`/dms/${conversationId}`);
}

export function getDmMessages(conversationId: string, query?: MessagesQuery) {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.before) params.set('before', query.before);
  const qs = params.toString();
  return get<DirectMessagesResponse>(`/dms/${conversationId}/messages${qs ? `?${qs}` : ''}`);
}

export function sendDmMessage(conversationId: string, data: SendDmRequest) {
  return post<DirectMessageResponse>(`/dms/${conversationId}/messages`, data);
}

export function updateDmMessage(conversationId: string, messageId: string, data: UpdateDmRequest) {
  return patch<DirectMessageResponse>(`/dms/${conversationId}/messages/${messageId}`, data);
}

export function reactToDmMessage(conversationId: string, messageId: string, data: ToggleDmReactionRequest) {
  return put<DirectMessageResponse>(`/dms/${conversationId}/messages/${messageId}/reactions`, data);
}

export function getBlockedIds() {
  return get<BlockedIdsResponse>('/users/me/blocks');
}

export function blockUser(userId: string) {
  return post<Record<string, never>>(`/users/me/blocks/${userId}`, {});
}

export function unblockUser(userId: string) {
  return del<Record<string, never>>(`/users/me/blocks/${userId}`);
}
