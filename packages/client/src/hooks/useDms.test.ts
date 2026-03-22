import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as dmsApi from '../api/dms.api';
import {
  useDmConversations,
  useSendDmMessage,
  injectDmMessage,
} from './useDms';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { DirectMessage, DirectConversation } from '../types/models';
import { DirectMessagesResponse } from '../types/api.types';

jest.mock('../api/dms.api');

type CacheData = {
  pages: DirectMessagesResponse[];
  pageParams: (string | undefined)[];
};

function makeDirectConversation(overrides: Partial<DirectConversation> = {}): DirectConversation {
  return {
    _id: 'conv-1',
    participantIds: ['user-1', 'user-2'] as [string, string],
    lastMessageAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDirectMessage(overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    _id: 'dm-1',
    conversationId: 'conv-1',
    authorId: 'user-1',
    content: 'Hello',
    attachmentIds: [],
    mentions: [],
    reactions: [],
    tone: null,
    editedAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('injectDmMessage', () => {
  it('injects a new message into the cache', () => {
    const queryClient = createTestQueryClient();
    const message = makeDirectMessage();

    queryClient.setQueryData<CacheData>(['dms', 'conv-1', 'messages'], {
      pages: [{ messages: [] }],
      pageParams: [undefined],
    });

    injectDmMessage(queryClient, message);

    const cached = queryClient.getQueryData<CacheData>(['dms', 'conv-1', 'messages']);

    expect(cached?.pages[0]?.messages).toHaveLength(1);
    expect(cached?.pages[0]?.messages[0]?._id).toBe('dm-1');
  });

  it('does not duplicate a message already in the cache', () => {
    const queryClient = createTestQueryClient();
    const message = makeDirectMessage();

    queryClient.setQueryData<CacheData>(['dms', 'conv-1', 'messages'], {
      pages: [{ messages: [message] }],
      pageParams: [undefined],
    });

    injectDmMessage(queryClient, message);

    const cached = queryClient.getQueryData<CacheData>(['dms', 'conv-1', 'messages']);

    expect(cached?.pages[0]?.messages).toHaveLength(1);
  });
});

describe('useDmConversations', () => {
  it('calls listConversations and returns conversations', async () => {
    const conversation = makeDirectConversation();
    jest.mocked(dmsApi.listConversations).mockResolvedValueOnce({ conversations: [conversation] });

    const { result } = renderHook(() => useDmConversations(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(dmsApi.listConversations).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([conversation]);
  });
});

describe('useSendDmMessage', () => {
  it('calls sendDmMessage and injects into cache on success', async () => {
    const queryClient = createTestQueryClient();
    const message = makeDirectMessage();

    jest.mocked(dmsApi.sendDmMessage).mockResolvedValueOnce({ message });

    queryClient.setQueryData<CacheData>(['dms', 'conv-1', 'messages'], {
      pages: [{ messages: [] }],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useSendDmMessage('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ content: 'Hello' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(dmsApi.sendDmMessage).toHaveBeenCalledWith('conv-1', { content: 'Hello' });

    const cached = queryClient.getQueryData<CacheData>(['dms', 'conv-1', 'messages']);

    expect(cached?.pages[0]?.messages).toHaveLength(1);
    expect(cached?.pages[0]?.messages[0]?._id).toBe('dm-1');
  });
});
