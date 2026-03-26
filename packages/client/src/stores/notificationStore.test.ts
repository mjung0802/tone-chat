import { useNotificationStore, hydrateNotificationPreference, selectTotalDmUnread } from './notificationStore';
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
  senderName: 'Test User',
  messageId: 'msg-dm-1',
  preview: 'Hello there!',
};

beforeEach(() => {
  useNotificationStore.setState({
    currentNotification: null,
    currentChannelId: null,
    currentConversationId: null,
    dmUnreadEntries: {},
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
  it('dmUnreadEntries starts as empty object', () => {
    expect(useNotificationStore.getState().dmUnreadEntries).toEqual({});
  });

  it('selectTotalDmUnread returns sum of all conversation counts', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-2', 'user-4');
    const total = selectTotalDmUnread(useNotificationStore.getState());
    expect(total).toBe(3);
  });

  it('selectTotalDmUnread returns 0 when no unreads', () => {
    const total = selectTotalDmUnread(useNotificationStore.getState());
    expect(total).toBe(0);
  });

  it('multiple conversations track independently', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-2', 'user-4');
    expect(useNotificationStore.getState().dmUnreadEntries['conv-1']?.count).toBe(2);
    expect(useNotificationStore.getState().dmUnreadEntries['conv-2']?.count).toBe(1);
  });

  it('incrementDmUnread increments count for a given conversationId', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    expect(useNotificationStore.getState().dmUnreadEntries['conv-1']?.count).toBe(1);

    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    expect(useNotificationStore.getState().dmUnreadEntries['conv-1']?.count).toBe(2);
  });

  it('incrementDmUnread tracks otherUserId per conversation', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    expect(useNotificationStore.getState().dmUnreadEntries['conv-1']?.otherUserId).toBe('user-3');
  });

  it('clearConversationUnread removes the entry for the given conversationId', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-2', 'user-4');
    useNotificationStore.getState().clearConversationUnread('conv-1');
    expect(useNotificationStore.getState().dmUnreadEntries['conv-1']).toBeUndefined();
    expect(useNotificationStore.getState().dmUnreadEntries['conv-2']?.count).toBe(1);
  });

  it('clearAllDmUnreads resets dmUnreadEntries to empty', () => {
    useNotificationStore.getState().incrementDmUnread('conv-1', 'user-3');
    useNotificationStore.getState().incrementDmUnread('conv-2', 'user-4');
    useNotificationStore.getState().clearAllDmUnreads();
    expect(useNotificationStore.getState().dmUnreadEntries).toEqual({});
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

  it('showNotification sets currentNotification to DmNotification', () => {
    useNotificationStore.getState().showNotification(dmNotification);
    expect(useNotificationStore.getState().currentNotification).toEqual(dmNotification);
  });

  it('dismissNotification clears DmNotification', () => {
    useNotificationStore.getState().showNotification(dmNotification);
    useNotificationStore.getState().dismissNotification();
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });
});
