import { renderHook } from "@testing-library/react-native";
import { useSocketStore } from "../stores/socketStore";
import { useNotificationStore } from "../stores/notificationStore";
import { createHookWrapper } from "../test-utils/renderWithProviders";
import { useMentionNotifications } from "./useMentionNotifications";
import type { MentionEvent } from "../types/socket.types";

function createMockSocket() {
  return {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    auth: {},
  };
}

function findHandler(
  mockSocket: ReturnType<typeof createMockSocket>,
  event: string,
) {
  const call = mockSocket.on.mock.calls.find(([e]: [string]) => e === event);
  return call?.[1] as ((event: MentionEvent) => void) | undefined;
}

describe("useMentionNotifications", () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
    useNotificationStore.setState({
      currentNotification: null,
      currentChannelId: null,
    });
  });

  afterEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it("registers mention listener on socket", () => {
    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    expect(mockSocket.on).toHaveBeenCalledWith("mention", expect.any(Function));
  });

  it("calls showNotification when mention event fires", () => {
    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, "mention");
    const event: MentionEvent = {
      messageId: "msg-1",
      channelId: "ch-1",
      serverId: "srv-1",
      authorId: "user-2",
    };
    handler!(event);

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
  });

  it("suppresses notification when currentChannelId matches", () => {
    useNotificationStore.setState({ currentChannelId: "ch-1" });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, "mention");
    handler!({
      messageId: "msg-1",
      channelId: "ch-1",
      serverId: "srv-1",
      authorId: "user-2",
    });

    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it("does not suppress when currentChannelId differs", () => {
    useNotificationStore.setState({ currentChannelId: "ch-other" });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, "mention");
    const event: MentionEvent = {
      messageId: "msg-1",
      channelId: "ch-1",
      serverId: "srv-1",
      authorId: "user-2",
    };
    handler!(event);

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith(
      "mention",
      expect.any(Function),
    );
  });

  it("does not register listener when socket is null", () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});
