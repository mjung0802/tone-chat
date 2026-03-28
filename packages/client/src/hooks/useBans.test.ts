import { renderHook, waitFor } from '@testing-library/react-native';
import * as bansApi from '../api/bans.api';
import { useUnban } from './useBans';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';

jest.mock('../api/bans.api');

const SERVER_ID = 'server-1';
const USER_ID = 'user-1';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useUnban', () => {
  it('invalidates both bans and audit-log queries on success', async () => {
    jest.mocked(bansApi.unbanUser).mockResolvedValueOnce({} as never);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUnban(SERVER_ID), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate(USER_ID);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['servers', SERVER_ID, 'bans'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['servers', SERVER_ID, 'audit-log'],
    });
  });
});
