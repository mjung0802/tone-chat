import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { injectMessage, updateMessageInCache, removeMessageFromCache, useMessages, useSendMessage, useDeleteMessage } from './useMessages';
import * as messagesApi from '../api/messages.api';
import { makeMessage } from '../test-utils/fixtures';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';
import type { MessagesResponse } from '../types/api.types';

jest.mock('../api/messages.api');

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  });
});

// ---------- helpers ----------

type CacheData = {
  pages: MessagesResponse[];
  pageParams: (string | undefined)[];
};

function seedCache(queryClient: QueryClient, serverId: string, channelId: string, pages: MessagesResponse[]): void {
  queryClient.setQueryData<CacheData>(
    ['servers', serverId, 'channels', channelId, 'messages'],
    { pages, pageParams: [undefined] },
  );
}

// ---------- injectMessage (pure function — no render needed) ----------

describe('injectMessage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('appends message to last page', () => {
    const existing = makeMessage({ _id: 'msg-1' });
    seedCache(queryClient, 'server-1', 'channel-1', [{ messages: [existing] }]);

    const newMsg = makeMessage({ _id: 'msg-2', content: 'New!' });
    injectMessage(queryClient, newMsg);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    const lastPage = data!.pages[data!.pages.length - 1]!;
    expect(lastPage.messages).toHaveLength(2);
    expect(lastPage.messages[1]!._id).toBe('msg-2');
  });

  it('deduplicates by _id', () => {
    const existing = makeMessage({ _id: 'msg-1' });
    seedCache(queryClient, 'server-1', 'channel-1', [{ messages: [existing] }]);

    injectMessage(queryClient, existing);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
  });

  it('no-ops when cache is empty (no data)', () => {
    const msg = makeMessage();

    // Should not throw
    injectMessage(queryClient, msg);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data).toBeUndefined();
  });

  it('no-ops when pages array is empty', () => {
    seedCache(queryClient, 'server-1', 'channel-1', []);

    const msg = makeMessage();
    injectMessage(queryClient, msg);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages).toHaveLength(0);
  });
});

// ---------- updateMessageInCache ----------

describe('updateMessageInCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('replaces message by _id', () => {
    const original = makeMessage({ _id: 'msg-1', content: 'old' });
    seedCache(queryClient, 'server-1', 'channel-1', [{ messages: [original] }]);

    const updated = makeMessage({ _id: 'msg-1', content: 'old', reactions: [{ emoji: '👍', userIds: ['u1'] }] });
    updateMessageInCache(queryClient, updated);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages[0]!.reactions).toEqual([{ emoji: '👍', userIds: ['u1'] }]);
  });

  it('works across pages', () => {
    const msg1 = makeMessage({ _id: 'msg-1' });
    const msg2 = makeMessage({ _id: 'msg-2' });
    seedCache(queryClient, 'server-1', 'channel-1', [
      { messages: [msg1] },
      { messages: [msg2] },
    ]);

    const updated = makeMessage({ _id: 'msg-2', reactions: [{ emoji: '🔥', userIds: ['u1'] }] });
    updateMessageInCache(queryClient, updated);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[1]!.messages[0]!.reactions).toEqual([{ emoji: '🔥', userIds: ['u1'] }]);
  });

  it('no-ops when _id does not match', () => {
    const original = makeMessage({ _id: 'msg-1', content: 'unchanged' });
    seedCache(queryClient, 'server-1', 'channel-1', [{ messages: [original] }]);

    const updated = makeMessage({ _id: 'msg-999', reactions: [{ emoji: '👍', userIds: ['u1'] }] });
    updateMessageInCache(queryClient, updated);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages[0]!.content).toBe('unchanged');
    expect(data!.pages[0]!.messages[0]!.reactions).toBeUndefined();
  });

  it('preserves other messages', () => {
    const msg1 = makeMessage({ _id: 'msg-1', content: 'first' });
    const msg2 = makeMessage({ _id: 'msg-2', content: 'second' });
    seedCache(queryClient, 'server-1', 'channel-1', [{ messages: [msg1, msg2] }]);

    const updated = makeMessage({ _id: 'msg-2', content: 'second', reactions: [{ emoji: '👍', userIds: ['u1'] }] });
    updateMessageInCache(queryClient, updated);

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(2);
    expect(data!.pages[0]!.messages[0]!._id).toBe('msg-1');
    expect(data!.pages[0]!.messages[0]!.reactions).toBeUndefined();
  });

  it('no-ops when cache is empty', () => {
    const msg = makeMessage();
    updateMessageInCache(queryClient, msg);
    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data).toBeUndefined();
  });
});

// ---------- removeMessageFromCache ----------

describe('removeMessageFromCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('removes message by _id from cache', () => {
    const msg1 = makeMessage({ _id: 'msg-1', serverId: 's1', channelId: 'c1' });
    const msg2 = makeMessage({ _id: 'msg-2', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [msg1, msg2] }]);

    removeMessageFromCache(queryClient, 's1', 'c1', 'msg-1');

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
    expect(data!.pages[0]!.messages[0]!._id).toBe('msg-2');
  });

  it('removes message from correct page when spread across pages', () => {
    const msg1 = makeMessage({ _id: 'msg-1', serverId: 's1', channelId: 'c1' });
    const msg2 = makeMessage({ _id: 'msg-2', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [msg1] }, { messages: [msg2] }]);

    removeMessageFromCache(queryClient, 's1', 'c1', 'msg-2');

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
    expect(data!.pages[1]!.messages).toHaveLength(0);
  });

  it('no-ops when _id does not exist in cache', () => {
    const msg = makeMessage({ _id: 'msg-1', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [msg] }]);

    removeMessageFromCache(queryClient, 's1', 'c1', 'nonexistent');

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
  });

  it('no-ops when cache is empty', () => {
    removeMessageFromCache(queryClient, 's1', 'c1', 'msg-1');

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data).toBeUndefined();
  });
});

// ---------- useDeleteMessage hook ----------

describe('useDeleteMessage', () => {
  it('removes message from cache on success', async () => {
    const queryClient = createTestQueryClient();
    const msg = makeMessage({ _id: 'msg-to-delete', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [msg] }]);

    jest.mocked(messagesApi.deleteMessage).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteMessage('s1', 'c1'), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate('msg-to-delete');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(0);
  });

  it('leaves cache unchanged on error', async () => {
    const queryClient = createTestQueryClient();
    const msg = makeMessage({ _id: 'msg-1', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [msg] }]);

    jest.mocked(messagesApi.deleteMessage).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDeleteMessage('s1', 'c1'), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate('msg-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
  });
});

// ---------- useMessages hook ----------

describe('useMessages', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useMessages('s1', 'c1'), { wrapper: createHookWrapper() });

    expect(messagesApi.getMessages).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useMessages('s1', 'c1'), { wrapper: createHookWrapper() });

    expect(messagesApi.getMessages).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns messages flattened from all pages', async () => {
    const page1 = { messages: [makeMessage({ _id: 'a' }), makeMessage({ _id: 'b' })] };
    const page2 = { messages: [makeMessage({ _id: 'c' })] };

    jest.mocked(messagesApi.getMessages).mockResolvedValueOnce(page1);

    const queryClient = createTestQueryClient();
    // Pre-seed with two pages so the select transform can flatten
    queryClient.setQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
      { pages: [page1, page2], pageParams: [undefined, 'a'] },
    );

    const { result } = renderHook(() => useMessages('s1', 'c1'), {
      wrapper: createHookWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data?.messages).toHaveLength(3);
    });

    expect(result.current.data!.messages.map((m) => m._id)).toEqual(['a', 'b', 'c']);
  });
});

// ---------- useSendMessage hook ----------

describe('useSendMessage', () => {
  it('onSuccess appends message to cache', async () => {
    const queryClient = createTestQueryClient();
    const existingMsg = makeMessage({ _id: 'existing', serverId: 's1', channelId: 'c1' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [existingMsg] }]);

    const newMsg = makeMessage({ _id: 'new-msg', content: 'Sent!', serverId: 's1', channelId: 'c1' });
    jest.mocked(messagesApi.sendMessage).mockResolvedValueOnce({ message: newMsg });

    const { result } = renderHook(() => useSendMessage('s1', 'c1'), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({ content: 'Sent!' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 's1', 'channels', 'c1', 'messages'],
    );
    const lastPage = data!.pages[data!.pages.length - 1]!;
    expect(lastPage.messages).toHaveLength(2);
    expect(lastPage.messages[1]!._id).toBe('new-msg');
  });
});
