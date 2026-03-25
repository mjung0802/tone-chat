import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as dmsApi from '../api/dms.api';
import {
  useDmConversations,
  useDmMessages,
  useSendDmMessage,
  injectDmMessage,
  updateConversationLastMessage,
} from './useDms';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { DirectMessage, DirectConversation } from '../types/models';
import { DirectConversationsResponse, DirectMessagesResponse } from '../types/api.types';

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
    lastMessage: null,
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

describe('updateConversationLastMessage', () => {
  it('updates the lastMessage on the matching conversation in the cache', () => {
    const queryClient = createTestQueryClient();
    const conversation = makeDirectConversation();

    queryClient.setQueryData<DirectConversationsResponse>(['dms'], {
      conversations: [conversation],
    });

    const message = makeDirectMessage({ conversationId: 'conv-1', content: 'New msg' });
    updateConversationLastMessage(queryClient, message);

    const cached = queryClient.getQueryData<DirectConversationsResponse>(['dms']);
    expect(cached?.conversations[0]?.lastMessage).toEqual(message);
  });

  it('does not modify other conversations', () => {
    const queryClient = createTestQueryClient();
    const conv1 = makeDirectConversation({ _id: 'conv-1' });
    const conv2 = makeDirectConversation({ _id: 'conv-2' });

    queryClient.setQueryData<DirectConversationsResponse>(['dms'], {
      conversations: [conv1, conv2],
    });

    const message = makeDirectMessage({ conversationId: 'conv-1', content: 'Hello' });
    updateConversationLastMessage(queryClient, message);

    const cached = queryClient.getQueryData<DirectConversationsResponse>(['dms']);
    expect(cached?.conversations[1]?.lastMessage).toBeNull();
  });
});

describe('useDmMessages', () => {
  it('refetches on mount even when cache is seeded', async () => {
    const queryClient = createTestQueryClient();
    const existingMsg = makeDirectMessage({ _id: 'dm-old' });
    const newMsg = makeDirectMessage({ _id: 'dm-new', content: 'New message' });

    queryClient.setQueryData<CacheData>(['dms', 'conv-1', 'messages'], {
      pages: [{ messages: [existingMsg] }],
      pageParams: [undefined],
    });

    jest.mocked(dmsApi.getDmMessages).mockResolvedValueOnce({
      messages: [existingMsg, newMsg],
    });

    const { result } = renderHook(() => useDmMessages('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    await waitFor(() => {
      expect(dmsApi.getDmMessages).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.data?.messages).toHaveLength(2);
    });
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

  it('updates the conversations cache lastMessage on success', async () => {
    const queryClient = createTestQueryClient();
    const conversation = makeDirectConversation();
    const message = makeDirectMessage();

    jest.mocked(dmsApi.sendDmMessage).mockResolvedValueOnce({ message });

    queryClient.setQueryData<CacheData>(['dms', 'conv-1', 'messages'], {
      pages: [{ messages: [] }],
      pageParams: [undefined],
    });
    queryClient.setQueryData<DirectConversationsResponse>(['dms'], {
      conversations: [conversation],
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

    const convCache = queryClient.getQueryData<DirectConversationsResponse>(['dms']);
    expect(convCache?.conversations[0]?.lastMessage?._id).toBe('dm-1');
  });
});
