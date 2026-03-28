import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AttachmentPicker } from './AttachmentPicker';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const DocumentPicker = jest.requireMock('expo-document-picker') as { getDocumentAsync: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AttachmentPicker', () => {
  it('renders button with correct accessibility label', () => {
    const { getByLabelText } = renderWithProviders(
      <AttachmentPicker onPick={jest.fn()} />,
    );

    expect(getByLabelText('Attach file')).toBeTruthy();
  });

  it('calls onPick with assets when user selects files', async () => {
    const assets = [
      { uri: 'file://photo.png', name: 'photo.png', mimeType: 'image/png', size: 1234 },
    ];
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets,
    });

    const onPick = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <AttachmentPicker onPick={onPick} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(assets);
    });
  });

  it('does not call onPick when user cancels', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const onPick = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <AttachmentPicker onPick={onPick} />,
    );

    fireEvent.press(getByLabelText('Attach file'));

    // Let the async handler resolve — waitFor handles fake timers automatically
    await waitFor(() => {
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
    });

    expect(onPick).not.toHaveBeenCalled();
  });

  it('button respects disabled prop', () => {
    const { getByLabelText } = renderWithProviders(
      <AttachmentPicker onPick={jest.fn()} disabled />,
    );

    const button = getByLabelText('Attach file');
    const isDisabled = button.props.accessibilityState?.disabled ?? button.props.disabled;
    expect(isDisabled).toBe(true);
  });
});
