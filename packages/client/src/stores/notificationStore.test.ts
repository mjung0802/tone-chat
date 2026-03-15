import { useNotificationStore } from './notificationStore';
import type { MentionNotification } from './notificationStore';

const notification: MentionNotification = {
  messageId: 'msg-1',
  channelId: 'ch-1',
  serverId: 'srv-1',
  authorId: 'user-2',
};

beforeEach(() => {
  useNotificationStore.setState({
    currentNotification: null,
    currentChannelId: null,
  });
});

describe('notificationStore', () => {
  it('starts with no notification', () => {
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it('showNotification sets currentNotification', () => {
    useNotificationStore.getState().showNotification(notification);
    expect(useNotificationStore.getState().currentNotification).toEqual(notification);
  });

  it('dismissNotification clears currentNotification', () => {
    useNotificationStore.getState().showNotification(notification);
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
});
