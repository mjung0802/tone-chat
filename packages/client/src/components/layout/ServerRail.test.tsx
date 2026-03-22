import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ServerRail } from './ServerRail';
import * as useServersModule from '@/hooks/useServers';
import * as notificationStore from '@/stores/notificationStore';
import * as useAuthModule from '@/hooks/useAuth';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import type { Server } from '@/types/models';
import type { UseQueryResult } from '@tanstack/react-query';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useServers');
jest.mock('@/hooks/useAuth');
jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: jest.fn(),
}));

function makeServer(overrides: Partial<Server> = {}): Server {
  return {
    _id: 'server-1',
    name: 'Test Server',
    ownerId: 'user-1',
    visibility: 'public',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeQueryResult<T>(
  overrides: Partial<UseQueryResult<T, Error>>,
): UseQueryResult<T, Error> {
  return {
    data: undefined as T,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isPending: false,
    error: null,
    status: 'pending',
    fetchStatus: 'idle',
    isRefetching: false,
    isStale: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isPaused: false,
    isEnabled: true,
    promise: Promise.resolve(undefined as T),
    refetch: jest.fn(),
    ...overrides,
  } as UseQueryResult<T, Error>;
}

beforeEach(() => {
  jest.clearAllMocks();

  jest.mocked(useAuthModule.useLogout).mockReturnValue(jest.fn());

  jest.mocked(notificationStore.useNotificationStore).mockImplementation((selector) => {
    const state = { dmUnreadCount: 0 };
    return (selector as (s: typeof state) => unknown)(state);
  });

  jest.mocked(useServersModule.useServers).mockReturnValue(
    makeQueryResult<Server[]>({
      data: [],
      isLoading: false,
      isSuccess: true,
      isPending: false,
      isFetched: true,
      isFetchedAfterMount: true,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
    }),
  );
});

describe('ServerRail', () => {
  it('renders the home button', () => {
    const { getByLabelText } = renderWithProviders(<ServerRail />);
    expect(getByLabelText('Home — direct messages')).toBeTruthy();
  });

  it('renders a server icon button for each server', () => {
    const servers = [
      makeServer({ _id: 'server-1', name: 'Alpha' }),
      makeServer({ _id: 'server-2', name: 'Beta' }),
    ];

    jest.mocked(useServersModule.useServers).mockReturnValue(
      makeQueryResult<Server[]>({
        data: servers,
        isLoading: false,
        isSuccess: true,
        isPending: false,
        isFetched: true,
        isFetchedAfterMount: true,
        status: 'success',
        fetchStatus: 'idle',
        dataUpdatedAt: Date.now(),
      }),
    );

    const { getByLabelText } = renderWithProviders(<ServerRail />);

    expect(getByLabelText('Alpha server')).toBeTruthy();
    expect(getByLabelText('Beta server')).toBeTruthy();
  });

  it('shows a badge when dmUnreadCount is greater than zero', () => {
    jest.mocked(notificationStore.useNotificationStore).mockImplementation((selector) => {
      const state = { dmUnreadCount: 3 };
      return (selector as (s: typeof state) => unknown)(state);
    });

    const { getByText } = renderWithProviders(<ServerRail />);

    expect(getByText('3')).toBeTruthy();
  });

  it('navigates to home when home button is pressed', () => {
    const { getByLabelText } = renderWithProviders(<ServerRail />);

    fireEvent.press(getByLabelText('Home — direct messages'));

    expect(mockPush).toHaveBeenCalledWith('/(main)/home');
  });
});
