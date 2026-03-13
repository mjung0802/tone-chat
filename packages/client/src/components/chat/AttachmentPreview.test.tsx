import { fireEvent } from '@testing-library/react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import React from 'react';
import { Image } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { AttachmentPreview, type PendingAttachment } from './AttachmentPreview';

function makePendingAttachment(overrides: Partial<PendingAttachment> = {}): PendingAttachment {
  return {
    file: {
      uri: 'file://photo.png',
      name: 'photo.png',
      mimeType: 'image/png',
      size: 1234,
    } as DocumentPickerAsset,
    uploading: false,
    ...overrides,
  };
}

describe('AttachmentPreview', () => {
  it('renders nothing when attachments array is empty', () => {
    const { queryByLabelText } = renderWithProviders(
      <AttachmentPreview attachments={[]} onRemove={jest.fn()} />,
    );

    expect(queryByLabelText(/attached/)).toBeNull();
  });

  it('renders filename for each attachment', () => {
    const attachments = [
      makePendingAttachment({ file: { uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 } as DocumentPickerAsset }),
      makePendingAttachment({ file: { uri: 'file://b.pdf', name: 'b.pdf', mimeType: 'application/pdf', size: 200 } as DocumentPickerAsset }),
    ];

    const { getByText } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={jest.fn()} />,
    );

    expect(getByText('a.png')).toBeTruthy();
    expect(getByText('b.pdf')).toBeTruthy();
  });

  it('shows spinner when uploading is true', () => {
    const attachments = [makePendingAttachment({ uploading: true })];

    const { UNSAFE_getByType } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={jest.fn()} />,
    );

    // ActivityIndicator should be present
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows error indicator when error is set', () => {
    const attachments = [makePendingAttachment({ error: 'Upload failed' })];

    const { getByText } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={jest.fn()} />,
    );

    expect(getByText('!')).toBeTruthy();
  });

  it('calls onRemove with correct index when remove button pressed', () => {
    const onRemove = jest.fn();
    const attachments = [
      makePendingAttachment({ file: { uri: 'file://a.png', name: 'a.png', mimeType: 'image/png', size: 100 } as DocumentPickerAsset }),
      makePendingAttachment({ file: { uri: 'file://b.png', name: 'b.png', mimeType: 'image/png', size: 200 } as DocumentPickerAsset }),
    ];

    const { getByLabelText } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={onRemove} />,
    );

    fireEvent.press(getByLabelText('Remove b.png'));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('truncates long filenames', () => {
    const longName = 'this-is-a-very-long-filename.png';
    const attachments = [
      makePendingAttachment({ file: { uri: 'file://long', name: longName, mimeType: 'image/png', size: 100 } as DocumentPickerAsset }),
    ];

    const { queryByText } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={jest.fn()} />,
    );

    // The full name should not appear since it exceeds 20 chars
    expect(queryByText(longName)).toBeNull();
  });

  it('renders thumbnail for image attachments', () => {
    const attachments = [
      makePendingAttachment({
        file: { uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 500 } as DocumentPickerAsset,
      }),
    ];

    const { UNSAFE_getByType } = renderWithProviders(
      <AttachmentPreview attachments={attachments} onRemove={jest.fn()} />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: 'file://photo.jpg' });
  });
});
