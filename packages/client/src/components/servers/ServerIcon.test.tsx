import React from 'react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { ServerIcon } from './ServerIcon';

jest.mock('../../hooks/useAttachments', () => ({
  useAttachment: jest.fn(),
}));

import { useAttachment } from '../../hooks/useAttachments';

const BASE_MOCK_ATTACHMENT = {
  id: 'att-123',
  uploader_id: 'u1',
  filename: 'icon.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 2000,
  storage_key: 'icons/icon.jpg',
  created_at: '2025-01-01T00:00:00.000Z',
};

describe('ServerIcon', () => {
  beforeEach(() => {
    jest.mocked(useAttachment).mockReset();
  });

  it('renders initials when no icon is provided', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <ServerIcon name="Test Server" />,
    );
    expect(getByText('TS')).toBeTruthy();
    expect(getByLabelText('Test Server server icon')).toBeTruthy();
  });

  it('renders image when icon attachment is ready', () => {
    jest.mocked(useAttachment).mockReturnValue({
      isLoading: false,
      data: {
        attachment: {
          ...BASE_MOCK_ATTACHMENT,
          status: 'ready',
          url: 'https://example.com/icon.jpg',
        },
      },
    } as ReturnType<typeof useAttachment>);

    const { getByLabelText } = renderWithProviders(
      <ServerIcon name="Test Server" icon="att-123" />,
    );
    expect(getByLabelText('Test Server server icon')).toBeTruthy();
  });

  it('falls back to initials when icon attachment is not ready', () => {
    jest.mocked(useAttachment).mockReturnValue({
      isLoading: false,
      data: {
        attachment: {
          ...BASE_MOCK_ATTACHMENT,
          status: 'processing',
          url: null,
        },
      },
    } as ReturnType<typeof useAttachment>);

    const { getByText, getByLabelText } = renderWithProviders(
      <ServerIcon name="Test Server" icon="att-123" />,
    );
    expect(getByText('TS')).toBeTruthy();
    expect(getByLabelText('Test Server server icon')).toBeTruthy();
  });

  it('renders single initial for single-word name', () => {
    const { getByText } = renderWithProviders(
      <ServerIcon name="Gaming" />,
    );
    expect(getByText('G')).toBeTruthy();
  });

  it('takes first two initials for multi-word name', () => {
    const { getByText } = renderWithProviders(
      <ServerIcon name="My Cool Server" />,
    );
    expect(getByText('MC')).toBeTruthy();
  });
});
