import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { Router } from 'expo-router';

export function mockQuerySuccess<T>(data: T): UseQueryResult<T, Error> {
  return {
    status: 'success',
    fetchStatus: 'idle',
    isSuccess: true,
    isError: false,
    isPending: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    isInitialLoading: false,
    isEnabled: true,
    data,
    error: null,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isPaused: false,
    isRefetching: false,
    isStale: false,
    refetch: jest.fn().mockResolvedValue({ data, status: 'success' }),
    promise: Promise.resolve(data),
  } as UseQueryResult<T, Error>;
}

export function mockRouter(overrides?: Partial<Router>): Router {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(false),
    canDismiss: jest.fn().mockReturnValue(false),
    setParams: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  } as Router;
}

export function mockMutationResult<TData = unknown, TVariables = unknown>(
  overrides?: Partial<UseMutationResult<TData, Error, TVariables>>,
): UseMutationResult<TData, Error, TVariables> {
  return {
    status: 'idle',
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    variables: undefined,
    submittedAt: 0,
    ...overrides,
  } as UseMutationResult<TData, Error, TVariables>;
}
