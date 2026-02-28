import { get, post, patch } from './client';
import type {
  MessageResponse,
  MessagesResponse,
  SendMessageRequest,
  UpdateMessageRequest,
  MessagesQuery,
} from '../types/api.types';

export function getMessages(serverId: string, channelId: string, query?: MessagesQuery) {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.before) params.set('before', query.before);
  const qs = params.toString();
  return get<MessagesResponse>(
    `/servers/${serverId}/channels/${channelId}/messages${qs ? `?${qs}` : ''}`,
  );
}

export function sendMessage(serverId: string, channelId: string, data: SendMessageRequest) {
  return post<MessageResponse>(
    `/servers/${serverId}/channels/${channelId}/messages`,
    data,
  );
}

export function updateMessage(
  serverId: string,
  channelId: string,
  messageId: string,
  data: UpdateMessageRequest,
) {
  return patch<MessageResponse>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
    data,
  );
}
