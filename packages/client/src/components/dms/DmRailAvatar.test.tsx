import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { DmRailAvatar } from './DmRailAvatar';
import * as useUserHook from '@/hooks/useUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import type { User } from '@/types/models';

jest.mock('@/hooks/useUser');
jest.mock('@/hooks/useAttachments', () => ({
  useAttachment: jest.fn().mockReturnValue({ data: undefined, isLoading: false }),
}));

import { useAttachment } from '@/hooks/useAttachments';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-42',
    username: 'testuser',
    email: 'test@example.com',
    email_verified: true,
    display_name: null,
    pronouns: null,
    avatar_url: null,
    status: 'online',
    bio: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DmRailAvatar', () => {
  it('renders Avatar.Text with first-letter initial when user has no avatar_url', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Alice', avatar_url: null }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders Avatar.Text using username initial when display_name is null', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: null, username: 'bob', avatar_url: null }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(screen.getByText('B')).toBeTruthy();
  });

  it('renders avatar image when user has avatar_url (attachment ID)', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Carol', avatar_url: 'att-avatar-carol' }),
    } as ReturnType<typeof useUserHook.useUser>);

    jest.mocked(useAttachment).mockReturnValue({
      isLoading: false,
      data: {
        attachment: {
          id: 'att-avatar-carol',
          status: 'ready',
          url: 'https://cdn.example.com/avatar.png',
          uploader_id: 'user-42',
          filename: 'avatar.png',
          mime_type: 'image/png',
          size_bytes: 1000,
          storage_key: 'avatars/avatar.png',
          created_at: '2025-01-01T00:00:00.000Z',
        },
      },
    } as ReturnType<typeof useAttachment>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    // UserAvatar renders Avatar.Image when attachment is ready — initial text should NOT appear
    expect(screen.queryByText('C')).toBeNull();
    // Positive assertion: verify UserAvatar rendered with correct accessibility label
    expect(screen.getByLabelText("Carol's avatar")).toBeDefined();
  });

  it('shows Badge when unreadCount > 0', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Dave' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={3} onPress={jest.fn()} />,
    );

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('hides badge when unreadCount === 0', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Eve' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows 99+ when unreadCount > 99', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Frank' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={150} onPress={jest.fn()} />,
    );

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows exact count when unreadCount is exactly 99', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Grace' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={99} onPress={jest.fn()} />,
    );

    expect(screen.getByText('99')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Hank' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label including display name', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: 'Iris' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(
      screen.getByRole('button', { name: 'Direct message with Iris' }),
    ).toBeTruthy();
  });

  it('uses username in accessibility label when display_name is null', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: makeUser({ display_name: null, username: 'jack' }),
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(
      screen.getByRole('button', { name: 'Direct message with jack' }),
    ).toBeTruthy();
  });

  it('falls back to otherUserId in accessibility label when user data is unavailable', () => {
    jest.mocked(useUserHook.useUser).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useUserHook.useUser>);

    renderWithProviders(
      <DmRailAvatar otherUserId="user-42" unreadCount={0} onPress={jest.fn()} />,
    );

    expect(
      screen.getByRole('button', { name: 'Direct message with user-42' }),
    ).toBeTruthy();
  });
});
