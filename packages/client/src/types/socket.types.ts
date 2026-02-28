import type { Message } from './models';

export interface JoinChannelPayload {
  serverId: string;
  channelId: string;
}

export interface LeaveChannelPayload {
  serverId: string;
  channelId: string;
}

export interface SendMessagePayload {
  serverId: string;
  channelId: string;
  content: string;
  attachmentIds?: string[];
}

export interface TypingPayload {
  serverId: string;
  channelId: string;
}

export interface TypingEvent {
  userId: string;
  channelId: string;
}

export interface ClientToServerEvents {
  join_channel: (payload: JoinChannelPayload) => void;
  leave_channel: (payload: LeaveChannelPayload) => void;
  send_message: (payload: SendMessagePayload) => void;
  typing: (payload: TypingPayload) => void;
}

export interface ServerToClientEvents {
  new_message: (message: Message) => void;
  typing: (event: TypingEvent) => void;
}
