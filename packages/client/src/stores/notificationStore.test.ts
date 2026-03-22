import { useNotificationStore, hydrateNotificationPreference } from './notificationStore';
import type { MentionNotification, DmNotification } from './notificationStore';

const mentionNotification: MentionNotification = {
  messageId: 'msg-1',
  channelId: 'ch-1',
  serverId: 'srv-1',
  authorId: 'user-2',
};

const dmNotification: DmNotification = {
  conversationId: 'conv-1',
  otherUserId: 'user-3',
  messageId: 'msg-dm-1',
  preview: 'Hello there!',
};

beforeEach(() => {
  useNotificationStore.setState({
    currentNotification: null,
    currentChannelId: null,
    currentConversationId: null,
    dmUnreadCount: 0,
    notificationPreference: 'quiet',
  });
  localStorage.clear();
});

describe('notificationStore', () => {
  it('starts with no notification', () => {
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it('showNotification sets currentNotification', () => {
    useNotificationStore.getState().showNotification(mentionNotification);
    expect(useNotificationStore.getState().currentNotification).toEqual(mentionNotification);
  });

  it('dismissNotification clears currentNotification', () => {
    useNotificationStore.getState().showNotification(mentionNotification);
    useNotificationStore.getState().dismissNotification();
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it('setCurrentChannelId updates currentChannelId', () => {
    useNotificationStore.getState().setCurrentChannelId('ch-5');
    expect(useNotificationStore.getState().currentChannelId).toBe('ch-5');
  });

  it('setCurrentChannelId accepts null', () => {
    useNotificationStore.getState().setCurrentChannelId('ch-5');
    useNotificationStore.getState().setCurrentChannelId(null);
    expect(useNotificationStore.getState().currentChannelId).toBeNull();
  });

  it('setNotificationPreference updates state', () => {
    useNotificationStore.getState().setNotificationPreference('system');
    expect(useNotificationStore.getState().notificationPreference).toBe('system');
  });

  it('setNotificationPreference persists to localStorage', () => {
    useNotificationStore.getState().setNotificationPreference('system');
    expect(localStorage.getItem('notificationPreference')).toBe('system');
  });

  it('hydrateNotificationPreference loads persisted value', async () => {
    localStorage.setItem('notificationPreference', 'system');
    await hydrateNotificationPreference();
    expect(useNotificationStore.getState().notificationPreference).toBe('system');
  });

  it('hydrateNotificationPreference defaults to quiet for invalid value', async () => {
    localStorage.setItem('notificationPreference', 'invalid');
    await hydrateNotificationPreference();
    expect(useNotificationStore.getState().notificationPreference).toBe('quiet');
  });
});

describe('notificationStore — DM features', () => {
  it('incrementDmUnread increments dmUnreadCount by 1', () => {
    useNotificationStore.getState().incrementDmUnread();
    expect(useNotificationStore.getState().dmUnreadCount).toBe(1);

    useNotificationStore.getState().incrementDmUnread();
    expect(useNotificationStore.getState().dmUnreadCount).toBe(2);
  });

  it('clearDmUnread resets dmUnreadCount to 0', () => {
    useNotificationStore.getState().incrementDmUnread();
    useNotificationStore.getState().incrementDmUnread();
    useNotificationStore.getState().clearDmUnread();
    expect(useNotificationStore.getState().dmUnreadCount).toBe(0);
  });

  it('setCurrentConversationId updates currentConversationId', () => {
    useNotificationStore.getState().setCurrentConversationId('conv-5');
    expect(useNotificationStore.getState().currentConversationId).toBe('conv-5');
  });

  it('setCurrentConversationId accepts null', () => {
    useNotificationStore.getState().setCurrentConversationId('conv-5');
    useNotificationStore.getState().setCurrentConversationId(null);
    expect(useNotificationStore.getState().currentConversationId).toBeNull();
  });

  it('showDmNotification sets currentNotification to DmNotification', () => {
    useNotificationStore.getState().showDmNotification(dmNotification);
    expect(useNotificationStore.getState().currentNotification).toEqual(dmNotification);
  });

  it('dismissNotification clears DmNotification', () => {
    useNotificationStore.getState().showDmNotification(dmNotification);
    useNotificationStore.getState().dismissNotification();
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });
});
