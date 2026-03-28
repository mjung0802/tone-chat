import { renderHook, waitFor } from '@testing-library/react-native';
import type { UseMutationResult } from '@tanstack/react-query';
import * as membersApi from '../api/members.api';
import {
  useKickMember,
  useMuteMember,
  useUnmuteMember,
  usePromoteMember,
  useDemoteMember,
  useBanMember,
} from './useMembers';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';

jest.mock('../api/members.api');

const SERVER_ID = 'server-1';
const USER_ID = 'user-1';

beforeEach(() => {
  jest.clearAllMocks();
});

// Using `any` here to avoid duplicating the test cases for each hook, since they all have the same structure and we only care about the side effects (invalidating queries) in this test suite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModerationHook = (serverId: string) => UseMutationResult<unknown, Error, any, unknown>;

const cases: Array<{
  name: string;
  hook: AnyModerationHook;
  mockFn: () => jest.Mock;
  mutateArg: unknown;
}> = [
  {
    name: 'useKickMember',
    hook: useKickMember,
    mockFn: () => jest.mocked(membersApi.removeMember).mockResolvedValueOnce({} as never),
    mutateArg: USER_ID,
  },
  {
    name: 'useMuteMember',
    hook: useMuteMember,
    mockFn: () => jest.mocked(membersApi.muteMember).mockResolvedValueOnce({} as never),
    mutateArg: { userId: USER_ID, data: { duration: 60 } },
  },
  {
    name: 'useUnmuteMember',
    hook: useUnmuteMember,
    mockFn: () => jest.mocked(membersApi.unmuteMember).mockResolvedValueOnce({} as never),
    mutateArg: USER_ID,
  },
  {
    name: 'usePromoteMember',
    hook: usePromoteMember,
    mockFn: () => jest.mocked(membersApi.promoteMember).mockResolvedValueOnce({} as never),
    mutateArg: USER_ID,
  },
  {
    name: 'useDemoteMember',
    hook: useDemoteMember,
    mockFn: () => jest.mocked(membersApi.demoteMember).mockResolvedValueOnce({} as never),
    mutateArg: USER_ID,
  },
  {
    name: 'useBanMember',
    hook: useBanMember,
    mockFn: () => jest.mocked(membersApi.banMember).mockResolvedValueOnce({} as never),
    mutateArg: { userId: USER_ID, data: {} },
  },
];

describe.each(cases)('$name', ({ hook, mockFn, mutateArg }) => {
  it('invalidates members and audit-log on success', async () => {
    mockFn();
    const queryClient = createTestQueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => hook(SERVER_ID), {
      wrapper: createHookWrapper(queryClient),
    });
    result.current.mutate(mutateArg);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['servers', SERVER_ID, 'members'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['servers', SERVER_ID, 'audit-log'] });
  });
});
