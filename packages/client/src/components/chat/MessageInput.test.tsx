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
    // mutateAsync returns a never-resolving promise to simulate in-progress upload
    const mutateAsync = jest.fn().mockReturnValue(new Promise(() => {}));
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
});
