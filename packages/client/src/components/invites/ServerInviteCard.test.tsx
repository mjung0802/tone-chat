import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ServerInviteCard } from './ServerInviteCard';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { useAuthStore } from '../../stores/authStore';
import * as invitesApi from '../../api/invites.api';
import * as serversApi from '../../api/servers.api';
import { ApiClientError } from '../../api/client';
import type { InviteStatusResponse } from '../../types/api.types';
import type { Server } from '../../types/models';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../api/invites.api');
jest.mock('../../api/servers.api');

const SERVER: Server = {
  _id: 'server-1',
  name: 'Test Server',
  ownerId: 'someone-else',
  visibility: 'private',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function statusFixture(overrides: Partial<InviteStatusResponse> = {}): InviteStatusResponse {
  return {
    code: 'abc',
    serverId: 'server-1',
    serverName: 'Test Server',
    status: 'valid',
    alreadyMember: false,
    banned: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'token',
    refreshToken: null,
    userId: 'me',
    isAuthenticated: true,
    isHydrated: true,
    emailVerified: true,
  });
  jest.mocked(serversApi.getServers).mockResolvedValue({ servers: [] });
});

function renderCard(overrides?: { serverName?: string; serverId?: string; code?: string }) {
  return renderWithProviders(
    <ServerInviteCard
      serverName={overrides?.serverName ?? 'Test Server'}
      serverId={overrides?.serverId ?? 'server-1'}
      code={overrides?.code ?? 'abc'}
    />,
  );
}

describe('ServerInviteCard — render states', () => {
  it('renders enabled "Join Server" for a valid invite', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());

    const { findByText } = renderCard();

    await findByText('Join Server');
  });

  it('shows "Already a member" instantly when user is already in the server (local data)', async () => {
    jest.mocked(serversApi.getServers).mockResolvedValue({ servers: [SERVER] });
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());

    const { findByText } = renderCard();

    await findByText('Already a member');
    await findByText("You're already a member of this server.");
  });

  it('shows "Already a member" when status response says alreadyMember', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ alreadyMember: true }),
    );

    const { findByText } = renderCard();

    await findByText('Already a member');
  });

  it('shows expired state when status is expired', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ status: 'expired' }),
    );

    const { findByText } = renderCard();

    await findByText('Invite expired');
    await findByText('This invite has expired.');
  });

  it('shows revoked state when status is revoked', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ status: 'revoked' }),
    );

    const { findByText } = renderCard();

    await findByText('Invite revoked');
    await findByText('This invite was revoked.');
  });

  it('shows exhausted state when status is exhausted', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ status: 'exhausted' }),
    );

    const { findByText } = renderCard();

    await findByText('Invite unavailable');
    await findByText('This invite has reached its maximum uses.');
  });

  it('shows not-found state when status is not-found', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ status: 'not-found', serverId: '', serverName: '' }),
    );

    const { findByText } = renderCard();

    await findByText('Invite unavailable');
    await findByText('This invite is no longer valid.');
  });

  it('shows banned state when banned flag is true', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(
      statusFixture({ banned: true }),
    );

    const { findByText } = renderCard();

    await findByText('Cannot join');
    await findByText('You are banned from this server.');
  });
});

describe('ServerInviteCard — click flow', () => {
  it('navigates to the server on successful join', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockResolvedValueOnce({
      member: { _id: 'm1', userId: 'me', serverId: 'server-1' } as never,
      server: SERVER,
    });

    const { findByText } = renderCard();
    const button = await findByText('Join Server');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/(main)/servers/server-1');
    });
  });

  it('maps INVITE_REVOKED click error to revoked disabled state', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('INVITE_REVOKED', 'gone', 410),
    );

    const { findByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Invite revoked');
    await findByText('This invite was revoked.');
  });

  it('maps INVITE_EXPIRED click error to expired disabled state', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('INVITE_EXPIRED', 'gone', 410),
    );

    const { findByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Invite expired');
    await findByText('This invite has expired.');
  });

  it('maps INVITE_EXHAUSTED click error to exhausted disabled state', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('INVITE_EXHAUSTED', 'gone', 410),
    );

    const { findByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Invite unavailable');
    await findByText('This invite has reached its maximum uses.');
  });

  it('maps BANNED click error to banned disabled state', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('BANNED', 'banned', 403),
    );

    const { findByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Cannot join');
    await findByText('You are banned from this server.');
  });

  it('maps ALREADY_MEMBER click error to already-member disabled state', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('ALREADY_MEMBER', 'already', 409),
    );

    const { findByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Already a member');
  });

  it('falls back to generic error for unknown error codes', async () => {
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValue(statusFixture());
    jest.mocked(invitesApi.joinViaCode).mockRejectedValueOnce(
      new ApiClientError('UNKNOWN', 'boom', 500),
    );

    const { findByText, queryByText } = renderCard();
    fireEvent.press(await findByText('Join Server'));

    await findByText('Something went wrong. Please try again.');
    expect(queryByText('Invite expired')).toBeNull();
  });
});
