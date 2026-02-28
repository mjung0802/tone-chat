import { get, post, patch, del } from './client';
import type {
  ChannelResponse,
  ChannelsResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
} from '../types/api.types';

export function getChannels(serverId: string) {
  return get<ChannelsResponse>(`/servers/${serverId}/channels`);
}

export function getChannel(serverId: string, channelId: string) {
  return get<ChannelResponse>(`/servers/${serverId}/channels/${channelId}`);
}

export function createChannel(serverId: string, data: CreateChannelRequest) {
  return post<ChannelResponse>(`/servers/${serverId}/channels`, data);
}

export function updateChannel(serverId: string, channelId: string, data: UpdateChannelRequest) {
  return patch<ChannelResponse>(`/servers/${serverId}/channels/${channelId}`, data);
}

export function deleteChannel(serverId: string, channelId: string) {
  return del(`/servers/${serverId}/channels/${channelId}`);
}
