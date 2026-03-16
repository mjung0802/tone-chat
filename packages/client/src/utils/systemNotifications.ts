import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    return Notification.permission === 'granted';
  }

  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function showSystemNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  const Notifications = await import('expo-notifications');
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
