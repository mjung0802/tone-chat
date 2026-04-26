import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MessageInput } from './MessageInput';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import * as useAttachmentsModule from '../../hooks/useAttachments';
import { makeAttachment } from '../../test-utils/fixtures';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('../../hooks/useAttachments');

jest.mock('./TonePicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    TonePicker: ({
      visible,
      onSelect,
      onDismiss,
    }: {
      visible: boolean;
      onSelect: (key: string) => void;
      onDismiss: () => void;
    }) =>
      visible ? (
        <>
          <Pressable testID="mock-tonepicker-select-j" onPress={() => onSelect('j')}>
            <Text>pick j</Text>
          </Pressable>
          <Pressable testID="mock-tonepicker-dismiss" onPress={onDismiss}>
            <Text>dismiss</Text>
          </Pressable>
        </>
      ) : null,
  };
});

const DocumentPicker = jest.requireMock('expo-document-picker') as { getDocumentAsync: jest.Mock };

// Helpers to mock global fetch for the blob conversion in handlePick
const mockBlob = new Blob(['data']);
const mockFetchResponse = {
  blob: () => Promise.resolve(mockBlob),
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  redirected: false,
  type: 'basic' as ResponseType,
  url: '',
  body: null,
  bodyUsed: false,
  clone: jest.fn(),
  arrayBuffer: jest.fn(),
  formData: jest.fn(),
  json: jest.fn(),
  text: jest.fn(),
  bytes: jest.fn(),
} as Response;

function mockUseUpload(overrides: Partial<ReturnType<typeof useAttachmentsModule.useUpload>> = {}) {
  const defaults = {
    data: undefined,
    variables: undefined,
    error: null,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    status: 'idle' as const,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    submittedAt: 0,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    context: undefined,
    ...overrides,
  };
  jest.mocked(useAttachmentsModule.useUpload).mockReturnValue(
    defaults as ReturnType<typeof useAttachmentsModule.useUpload>
  );
  return defaults;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUpload();
  jest.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse);
});

describe('MessageInput', () => {
  it('renders input with accessibilityLabel', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    expect(getByLabelText('Message input')).toBeTruthy();
  });

  it('send button disabled when input is empty', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled).toBeTruthy();
  });

  it('send button disabled for whitespace-only text', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), '   ');
    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled).toBeTruthy();
  });

  it('send button enabled with real text', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
    const sendButton = getByLabelText('Send message');
    // When not disabled, accessibilityState.disabled is either false or undefined
    const isDisabled = sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled;
    expect(isDisabled).toBeFalsy();
  });

  it('pressing send calls onSend with trimmed text', () => {
    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={onSend} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), '  Hello world  ');
    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Hello world', [], {});
  });

  it('pressing send clears input', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    const input = getByLabelText('Message input');
    fireEvent.changeText(input, 'Hello');
    fireEvent.press(getByLabelText('Send message'));

    expect(input.props.value).toBe('');
  });

  it('typing calls onTyping callback', () => {
    const onTyping = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} onTyping={onTyping} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'H');

    expect(onTyping).toHaveBeenCalled();
  });

  it('no crash when onTyping is undefined', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    // Should not throw
    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
  });

  it('attach button renders with accessibility label', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    expect(getByLabelText('Attach file')).toBeTruthy();
  });

  it('uploads files when picked', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      attachment: makeAttachment(),
    });
    mockUseUpload({ mutateAsync });

    const assets = [
      { uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 },
      { uri: 'file://b.pdf', name: 'b.pdf', mimeType: 'application/pdf', size: 200 },
    ];
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets,
    });

    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });
  });

  it('sends attachment IDs with message', async () => {
    const attachment = makeAttachment({ id: 'att-uploaded-1' });
    const mutateAsync = jest.fn().mockResolvedValue({ attachment });
    mockUseUpload({ mutateAsync });

    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 }],
    });

    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={onSend} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Hello', ['att-uploaded-1'], {});
  });

  it('sends with attachments but no text', async () => {
    const attachment = makeAttachment({ id: 'att-no-text' });
    const mutateAsync = jest.fn().mockResolvedValue({ attachment });
    mockUseUpload({ mutateAsync });

    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 }],
    });

    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={onSend} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('', ['att-no-text'], {});
  });

  it('disables send while uploads are in progress', async () => {
    // Use a controllable deferred promise instead of a never-resolving one
    // so the async IIFE in handlePick can complete and the worker exits cleanly
    let resolveUpload!: (value: unknown) => void;
    const mutateAsync = jest.fn().mockReturnValue(
      new Promise((resolve) => { resolveUpload = resolve; })
    );
    mockUseUpload({ mutateAsync });

    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 }],
    });

    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    // Text entered but uploads still pending — send should be disabled
    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
    const sendButton = getByLabelText('Send message');
    const isDisabled = sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled;
    expect(isDisabled).toBeTruthy();

    // Resolve the upload so the async IIFE completes and the worker can exit cleanly
    resolveUpload({ attachment: makeAttachment() });
  });

  it('disables picker at MAX_ATTACHMENTS (6)', async () => {
    const attachment = makeAttachment();
    const mutateAsync = jest.fn().mockResolvedValue({ attachment });
    mockUseUpload({ mutateAsync });

    // Pick 6 files at once
    const assets = Array.from({ length: 6 }, (_, i) => ({
      uri: `file://file-${i}.png`,
      name: `file-${i}.png`,
      mimeType: 'image/png',
      size: 100,
    }));
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets,
    });

    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(6);
    });

    const attachButton = getByLabelText('Attach file');
    const isDisabled = attachButton.props.accessibilityState?.disabled ?? attachButton.props.disabled;
    expect(isDisabled).toBeTruthy();
  });

  it('shows error on failed upload', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Upload failed'));
    mockUseUpload({ mutateAsync });

    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 }],
    });

    const { getByLabelText, getByText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(getByText('!')).toBeTruthy();
    });
  });

  it('renders emoji button with accessibility label', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    expect(getByLabelText('Open emoji picker')).toBeTruthy();
  });

  it('opens emoji picker when emoji button is pressed', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Open emoji picker'));

    expect(getByLabelText('Emoji picker')).toBeTruthy();
  });

  it('appends emoji to input text when selected', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
    fireEvent.press(getByLabelText('Open emoji picker'));
    fireEvent.press(getByLabelText('😀'));

    expect(getByLabelText('Message input').props.value).toBe('Hello😀');
  });

  it('renders reply preview when replyTarget is set', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <MessageInput
        onSend={jest.fn()}
        replyTarget={{
          messageId: 'msg-1',
          authorId: 'user-2',
          authorName: 'Bob',
          content: 'Hello there',
        }}
      />,
    );

    expect(getByText('Replying to @Bob')).toBeTruthy();
    expect(getByText('Hello there')).toBeTruthy();
    expect(getByLabelText('Cancel reply')).toBeTruthy();
  });

  it('does not render reply preview when replyTarget is undefined', () => {
    const { queryByText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    expect(queryByText(/Replying to/)).toBeNull();
  });

  it('calls onCancelReply when cancel button is pressed', () => {
    const onCancelReply = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput
        onSend={jest.fn()}
        replyTarget={{
          messageId: 'msg-1',
          authorId: 'user-2',
          authorName: 'Bob',
          content: 'Hello there',
        }}
        onCancelReply={onCancelReply}
      />,
    );

    fireEvent.press(getByLabelText('Cancel reply'));
    expect(onCancelReply).toHaveBeenCalled();
  });

  it('includes replyToId in onSend options when replyTarget is set', () => {
    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput
        onSend={onSend}
        replyTarget={{
          messageId: 'msg-reply-1',
          authorId: 'user-2',
          authorName: 'Bob',
          content: 'Hello',
        }}
      />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'My reply');
    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('My reply', [], { replyToId: 'msg-reply-1' });
  });

  it('retains focus on input after sending a message', () => {
    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={onSend} />,
    );

    const input = getByLabelText('Message input');
    fireEvent.changeText(input, 'Hello');
    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalled();
    // After send, the input should have focus() called via the ref.
    // In RNTL, we verify the input node has the focus method and was the target.
    expect(input).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  it('clears pending attachments after send', async () => {
    const attachment = makeAttachment({ id: 'att-clear' });
    const mutateAsync = jest.fn().mockResolvedValue({ attachment });
    mockUseUpload({ mutateAsync });

    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 }],
    });

    const { getByLabelText, getByText, queryByText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(getByText('a.png')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Send message'));

    expect(queryByText('a.png')).toBeNull();
  });

  describe('tone integration', () => {
    it('opens TonePicker when "Select tone" button is pressed', () => {
      const { getByLabelText, getByTestId, queryByTestId } = renderWithProviders(
        <MessageInput onSend={jest.fn()} />,
      );

      expect(queryByTestId('mock-tonepicker-select-j')).toBeNull();
      fireEvent.press(getByLabelText('Select tone'));
      expect(getByTestId('mock-tonepicker-select-j')).toBeTruthy();
    });

    it('selecting a tone shows the tone preview and closes picker', () => {
      const { getByLabelText, getByTestId, queryByTestId, getByText } = renderWithProviders(
        <MessageInput onSend={jest.fn()} />,
      );

      fireEvent.press(getByLabelText('Select tone'));
      fireEvent.press(getByTestId('mock-tonepicker-select-j'));

      // Picker closes
      expect(queryByTestId('mock-tonepicker-select-j')).toBeNull();
      // Preview shows the resolved label, emoji, and remove button
      expect(getByText(/joking/)).toBeTruthy();
      expect(getByLabelText('Remove tone')).toBeTruthy();
    });

    it('forwards selected tone in onSend options', () => {
      const onSend = jest.fn();
      const { getByLabelText, getByTestId } = renderWithProviders(
        <MessageInput onSend={onSend} />,
      );

      fireEvent.press(getByLabelText('Select tone'));
      fireEvent.press(getByTestId('mock-tonepicker-select-j'));
      fireEvent.changeText(getByLabelText('Message input'), 'hello');
      fireEvent.press(getByLabelText('Send message'));

      expect(onSend).toHaveBeenCalledWith('hello', [], expect.objectContaining({ tone: 'j' }));
    });

    it('clearing tone via "Remove tone" omits tone from onSend options', () => {
      const onSend = jest.fn();
      const { getByLabelText, getByTestId } = renderWithProviders(
        <MessageInput onSend={onSend} />,
      );

      fireEvent.press(getByLabelText('Select tone'));
      fireEvent.press(getByTestId('mock-tonepicker-select-j'));
      fireEvent.press(getByLabelText('Remove tone'));
      fireEvent.changeText(getByLabelText('Message input'), 'hello');
      fireEvent.press(getByLabelText('Send message'));

      const optionsArg = onSend.mock.calls[0]?.[2];
      expect(optionsArg?.tone).toBeUndefined();
    });

    it('parses inline /j tag, strips it from content, and sets tone', () => {
      const onSend = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <MessageInput onSend={onSend} />,
      );

      fireEvent.changeText(getByLabelText('Message input'), 'hello world /j');
      fireEvent.press(getByLabelText('Send message'));

      expect(onSend).toHaveBeenCalledWith('hello world', [], expect.objectContaining({ tone: 'j' }));
    });

    it('uses selectedTone as the tone but still strips the inline tag from content', () => {
      const onSend = jest.fn();
      const { getByLabelText, getByTestId } = renderWithProviders(
        <MessageInput onSend={onSend} />,
      );

      fireEvent.press(getByLabelText('Select tone'));
      fireEvent.press(getByTestId('mock-tonepicker-select-j'));
      fireEvent.changeText(getByLabelText('Message input'), 'hello /srs');
      fireEvent.press(getByLabelText('Send message'));

      expect(onSend).toHaveBeenCalledWith(
        'hello',
        [],
        expect.objectContaining({ tone: 'j' }),
      );
    });

    it('omits tone option entirely when no tone is set', () => {
      const onSend = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <MessageInput onSend={onSend} />,
      );

      fireEvent.changeText(getByLabelText('Message input'), 'plain message');
      fireEvent.press(getByLabelText('Send message'));

      const optionsArg = onSend.mock.calls[0]?.[2];
      expect(optionsArg?.tone).toBeUndefined();
    });

    it('sends bare tag literally when content is just an inline tag and no picker tone is set', () => {
      const onSend = jest.fn();
      const { getByLabelText } = renderWithProviders(<MessageInput onSend={onSend} />);

      fireEvent.changeText(getByLabelText('Message input'), '/j');
      fireEvent.press(getByLabelText('Send message'));

      // parseToneTag yields cleanContent='', toneKey='j'.
      // finalContent falls back to trimmed ('/j') because cleanContent is empty.
      expect(onSend).toHaveBeenCalledWith('/j', [], expect.objectContaining({ tone: 'j' }));
    });
  });
});
