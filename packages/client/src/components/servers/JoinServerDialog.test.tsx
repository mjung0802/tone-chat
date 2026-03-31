import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { JoinServerDialog } from './JoinServerDialog';
import * as useInvitesModule from '@/hooks/useInvites';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import type { UseMutationResult } from '@tanstack/react-query';
import type { JoinInviteResponse } from '@/types/api.types';

jest.mock('@/hooks/useInvites');

function makeMutationResult(
  overrides: Partial<UseMutationResult<JoinInviteResponse, Error, string>> = {},
): UseMutationResult<JoinInviteResponse, Error, string> {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    data: undefined,
    error: null,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    status: 'idle',
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
    ...overrides,
  } as UseMutationResult<JoinInviteResponse, Error, string>;
}

const mockOnDismiss = jest.fn();
const mockOnJoined = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useInvitesModule.useJoinViaCode).mockReturnValue(makeMutationResult());
});

describe('JoinServerDialog', () => {
  it('renders input and buttons when visible', () => {
    const { getByLabelText } = renderWithProviders(
      <JoinServerDialog visible onDismiss={mockOnDismiss} onJoined={mockOnJoined} />,
    );

    expect(getByLabelText('Invite code')).toBeTruthy();
    expect(getByLabelText('Cancel')).toBeTruthy();
    expect(getByLabelText('Join server')).toBeTruthy();
  });

  it('disables join button when input is empty', () => {
    const { getByLabelText } = renderWithProviders(
      <JoinServerDialog visible onDismiss={mockOnDismiss} onJoined={mockOnJoined} />,
    );

    const joinButton = getByLabelText('Join server');
    expect(joinButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls mutate with trimmed code on join press', () => {
    const mockMutate = jest.fn();
    jest.mocked(useInvitesModule.useJoinViaCode).mockReturnValue(
      makeMutationResult({ mutate: mockMutate }),
    );

    const { getByLabelText } = renderWithProviders(
      <JoinServerDialog visible onDismiss={mockOnDismiss} onJoined={mockOnJoined} />,
    );

    fireEvent.changeText(getByLabelText('Invite code'), '  abc123  ');
    fireEvent.press(getByLabelText('Join server'));

    expect(mockMutate).toHaveBeenCalledWith('abc123', expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('calls onDismiss and resets on cancel', () => {
    const mockReset = jest.fn();
    jest.mocked(useInvitesModule.useJoinViaCode).mockReturnValue(
      makeMutationResult({ reset: mockReset }),
    );

    const { getByLabelText } = renderWithProviders(
      <JoinServerDialog visible onDismiss={mockOnDismiss} onJoined={mockOnJoined} />,
    );

    fireEvent.press(getByLabelText('Cancel'));

    expect(mockReset).toHaveBeenCalled();
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('shows error message on failure', () => {
    jest.mocked(useInvitesModule.useJoinViaCode).mockReturnValue(
      makeMutationResult({
        error: new Error('Something went wrong'),
        isError: true,
      }),
    );

    const { getByText } = renderWithProviders(
      <JoinServerDialog visible onDismiss={mockOnDismiss} onJoined={mockOnJoined} />,
    );

    expect(getByText('Failed to join server')).toBeTruthy();
  });
});
