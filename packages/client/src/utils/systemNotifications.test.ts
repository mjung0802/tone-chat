import { requestNotificationPermission, hasNotificationPermission, showSystemNotification } from './systemNotifications';

// Mock the web Notification API
const MockNotification = jest.fn() as jest.Mock & {
  requestPermission: jest.Mock;
  permission: NotificationPermission;
};
MockNotification.requestPermission = jest.fn();
MockNotification.permission = 'default';

beforeEach(() => {
  MockNotification.mockClear();
  MockNotification.requestPermission.mockReset();
  MockNotification.permission = 'default';
  Object.defineProperty(global, 'Notification', { value: MockNotification, writable: true, configurable: true });
});

describe('requestNotificationPermission', () => {
  it('returns true when permission is granted', async () => {
    MockNotification.requestPermission.mockResolvedValue('granted');
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(MockNotification.requestPermission).toHaveBeenCalled();
  });

  it('returns false when permission is denied', async () => {
    MockNotification.requestPermission.mockResolvedValue('denied');
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('hasNotificationPermission', () => {
  it('returns true when permission is granted', async () => {
    MockNotification.permission = 'granted';
    const result = await hasNotificationPermission();
    expect(result).toBe(true);
  });

  it('returns false when permission is default', async () => {
    MockNotification.permission = 'default';
    const result = await hasNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('showSystemNotification', () => {
  it('creates a Notification when permission is granted', async () => {
    MockNotification.permission = 'granted';
    await showSystemNotification('Title', 'Body text');
    expect(MockNotification).toHaveBeenCalledWith('Title', { body: 'Body text' });
  });

  it('does nothing when permission is not granted', async () => {
    MockNotification.permission = 'denied';
    await showSystemNotification('Title', 'Body text');
    expect(MockNotification).not.toHaveBeenCalled();
  });
});
