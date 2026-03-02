import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { injectMessage, useMessages, useSendMessage } from './useMessages';
import * as messagesApi from '../api/messages.api';
import { makeMessage } from '../test-utils/fixtures';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import type { MessagesResponse } from '../types/api.types';

jest.mock('../api/messages.api');

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
    queryClient = new QueryClient();
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

// ---------- useMessages hook ----------

describe('useMessages', () => {
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
    const existingMsg = makeMessage({ _id: 'existing' });
    seedCache(queryClient, 's1', 'c1', [{ messages: [existingMsg] }]);

    const newMsg = makeMessage({ _id: 'new-msg', content: 'Sent!' });
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
