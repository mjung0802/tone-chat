import type { Message, DirectMessage } from './models';

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
  replyToId?: string;
  mentions?: string[];
  tone?: string;
}

export interface TypingPayload {
  serverId: string;
  channelId: string;
}

export interface TypingEvent {
  userId: string;
  channelId: string;
}

export interface ToggleReactionPayload {
  serverId: string;
  channelId: string;
  messageId: string;
  emoji: string;
}

export interface MentionEvent {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

export interface DmSendPayload {
  conversationId: string;
  content?: string | undefined;
  attachmentIds?: string[] | undefined;
  replyToId?: string | undefined;
  mentions?: string[] | undefined;
  tone?: string | undefined;
}

export interface ClientToServerEvents {
  join_channel: (payload: JoinChannelPayload) => void;
  leave_channel: (payload: LeaveChannelPayload) => void;
  send_message: (payload: SendMessagePayload) => void;
  typing: (payload: TypingPayload) => void;
  toggle_reaction: (payload: ToggleReactionPayload) => void;
  join_dm: (payload: { conversationId: string }) => void;
  leave_dm: (payload: { conversationId: string }) => void;
  'dm:send': (payload: DmSendPayload) => void;
  'dm:typing': (payload: { conversationId: string }) => void;
  'dm:react': (payload: { conversationId: string; messageId: string; emoji: string }) => void;
}

export interface ServerToClientEvents {
  new_message: (data: { message: Message }) => void;
  typing: (event: TypingEvent) => void;
  reaction_updated: (data: { message: Message }) => void;
  mention: (event: MentionEvent) => void;
  'dm:new_message': (data: { message: DirectMessage }) => void;
  'dm:typing': (event: { conversationId: string; userId: string }) => void;
  'dm:reaction_updated': (data: { message: DirectMessage }) => void;
  'dm:notification': (event: { conversationId: string; otherUserId: string; senderName: string; preview: string }) => void;
}
