import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { DmList } from './DmList';
import * as useDmsModule from '@/hooks/useDms';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import type { DirectConversation } from '@/types/models';
import type { UseQueryResult } from '@tanstack/react-query';

jest.mock('@/hooks/useDms');
jest.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: undefined }),
}));

function makeConversation(overrides: Partial<DirectConversation> = {}): DirectConversation {
  return {
    _id: 'conv-1',
    participantIds: ['user-123', 'user-456'] as [string, string],
    lastMessageAt: null,
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
});

describe('DmList', () => {
  it('shows loading spinner while loading', () => {
    jest.mocked(useDmsModule.useDmConversations).mockReturnValue(
      makeQueryResult<DirectConversation[]>({
        data: undefined,
        isLoading: true,
        isPending: true,
        isFetching: true,
        status: 'pending',
        fetchStatus: 'fetching',
      }),
    );

    const { getByRole } = renderWithProviders(
      <DmList currentUserId="user-123" onConversationPress={jest.fn()} />,
    );

    expect(getByRole('progressbar')).toBeTruthy();
  });

  it('shows empty state when no conversations', () => {
    jest.mocked(useDmsModule.useDmConversations).mockReturnValue(
      makeQueryResult<DirectConversation[]>({
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

    const { getByText } = renderWithProviders(
      <DmList currentUserId="user-123" onConversationPress={jest.fn()} />,
    );

    expect(getByText('No conversations yet')).toBeTruthy();
  });

  it('renders a DmListItem for each conversation', () => {
    const conversations = [
      makeConversation({ _id: 'conv-1' }),
      makeConversation({ _id: 'conv-2', participantIds: ['user-123', 'user-789'] as [string, string] }),
    ];

    jest.mocked(useDmsModule.useDmConversations).mockReturnValue(
      makeQueryResult<DirectConversation[]>({
        data: conversations,
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

    const { getAllByRole } = renderWithProviders(
      <DmList currentUserId="user-123" onConversationPress={jest.fn()} />,
    );

    // Each DmListItem renders a button
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('calls onConversationPress when an item is pressed', () => {
    const onConversationPress = jest.fn();
    const conversations = [makeConversation({ _id: 'conv-1' })];

    jest.mocked(useDmsModule.useDmConversations).mockReturnValue(
      makeQueryResult<DirectConversation[]>({
        data: conversations,
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

    const { getByRole } = renderWithProviders(
      <DmList currentUserId="user-123" onConversationPress={onConversationPress} />,
    );

    fireEvent.press(getByRole('button'));

    expect(onConversationPress).toHaveBeenCalledWith('conv-1');
  });
});
