import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AttachmentBubble } from './AttachmentBubble';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import * as useAttachmentsModule from '../../hooks/useAttachments';
import { makeAttachment } from '../../test-utils/fixtures';

jest.mock('../../hooks/useAttachments');

beforeEach(() => {
  jest.clearAllMocks();
});

function mockUseAttachment(overrides: Partial<ReturnType<typeof useAttachmentsModule.useAttachment>> = {}) {
  const defaults = {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    ...overrides,
  };
  jest.mocked(useAttachmentsModule.useAttachment).mockReturnValue(defaults as ReturnType<typeof useAttachmentsModule.useAttachment>);
}

describe('AttachmentBubble', () => {
  it('shows loading spinner when isLoading is true', () => {
    mockUseAttachment({ isLoading: true });

    const { UNSAFE_getByType } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    const { ActivityIndicator } = require('react-native-paper');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows "Attachment unavailable" on error', () => {
    mockUseAttachment({ isError: true });

    const { getByText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    expect(getByText('Attachment unavailable')).toBeTruthy();
  });

  it('shows "Attachment unavailable" when status is not ready', () => {
    const attachment = makeAttachment({ status: 'processing' });
    mockUseAttachment({ data: { attachment } });

    const { getByText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    expect(getByText('Attachment unavailable')).toBeTruthy();
  });

  it('renders image for image MIME types with correct accessibility', () => {
    const attachment = makeAttachment({ mime_type: 'image/png', filename: 'photo.png' });
    mockUseAttachment({ data: { attachment } });

    const { getByLabelText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    expect(getByLabelText('photo.png')).toBeTruthy();
  });

  it('renders file card with filename and formatted size for non-images', () => {
    const attachment = makeAttachment({
      mime_type: 'application/pdf',
      filename: 'doc.pdf',
      size_bytes: 2048,
    });
    mockUseAttachment({ data: { attachment } });

    const { getByText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    expect(getByText('doc.pdf')).toBeTruthy();
    expect(getByText('2.0 KB')).toBeTruthy();
  });

  it('calls onImagePress when image is pressed', () => {
    const attachment = makeAttachment({ mime_type: 'image/jpeg', filename: 'pic.jpg' });
    mockUseAttachment({ data: { attachment } });

    const onImagePress = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" onImagePress={onImagePress} />,
    );

    fireEvent.press(getByLabelText('pic.jpg'));

    expect(onImagePress).toHaveBeenCalledWith(attachment);
  });

  it('opens URL when file card is pressed', () => {
    const { Linking } = require('react-native');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const attachment = makeAttachment({
      mime_type: 'application/pdf',
      filename: 'report.pdf',
      size_bytes: 4096,
      url: 'http://localhost:9000/uploads/report.pdf',
    });
    mockUseAttachment({ data: { attachment } });

    const { getByLabelText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    fireEvent.press(getByLabelText(/File: report\.pdf/));

    expect(Linking.openURL).toHaveBeenCalledWith('http://localhost:9000/uploads/report.pdf');
  });

  it('shows unavailable for failed status', () => {
    const attachment = makeAttachment({ status: 'failed' });
    mockUseAttachment({ data: { attachment } });

    const { getByText } = renderWithProviders(
      <AttachmentBubble attachmentId="att-1" />,
    );

    expect(getByText('Attachment unavailable')).toBeTruthy();
  });
});
