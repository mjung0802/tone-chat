import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { type QueryClient } from '@tanstack/react-query';
import { makeMember, makeUser } from '../../test-utils/fixtures';
import { renderWithProviders, createTestQueryClient } from '../../test-utils/renderWithProviders';
import { useUiStore } from '../../stores/uiStore';
import { UserProfileModal } from './UserProfileModal';

jest.mock('../../api/users.api');
jest.mock('../../api/servers.api');
jest.mock('../../api/members.api');

const TARGET_USER_ID = 'user-456';
const ACTOR_USER_ID = 'user-123';
const SERVER_ID = 'server-1';

function seedQueryData(queryClient: QueryClient, overrides: {
  targetUser?: Parameters<typeof makeUser>[0];
  targetMember?: Parameters<typeof makeMember>[0];
  actorRole?: 'member' | 'mod' | 'admin';
  serverOwnerId?: string;
} = {}) {
  const targetUser = makeUser({
    id: TARGET_USER_ID,
    username: 'janedoe',
    display_name: 'Jane Doe',
    pronouns: 'she/her',
    bio: 'Hello world',
    ...overrides.targetUser,
  });

  const actorMember = makeMember({
    _id: 'member-actor',
    userId: ACTOR_USER_ID,
    role: overrides.actorRole ?? 'admin',
  });

  const targetMember = makeMember({
    _id: 'member-target',
    userId: TARGET_USER_ID,
    role: 'member',
    username: 'janedoe',
    display_name: 'Jane Doe',
    ...overrides.targetMember,
  });

  const meUser = makeUser({ id: ACTOR_USER_ID });

  queryClient.setQueryData(['users', TARGET_USER_ID], { user: targetUser });
  queryClient.setQueryData(['me'], { user: meUser });
  queryClient.setQueryData(['servers', SERVER_ID, 'members'], { members: [actorMember, targetMember] });
  queryClient.setQueryData(['servers', SERVER_ID], {
    server: { _id: SERVER_ID, name: 'Test Server', ownerId: overrides.serverOwnerId ?? 'owner-999' },
  });
}

function renderModal(overrides: Parameters<typeof seedQueryData>[1] = {}) {
  const queryClient = createTestQueryClient();
  seedQueryData(queryClient, overrides);

  useUiStore.setState({
    profileModal: { visible: true, userId: TARGET_USER_ID, serverId: SERVER_ID },
  });

  return renderWithProviders(<UserProfileModal />, { queryClient });
}

beforeEach(() => {
  useUiStore.setState({
    profileModal: { visible: false, userId: null, serverId: null },
  });
});

describe('UserProfileModal', () => {
  it('renders user profile data when visible', () => {
    const { getByText } = renderModal();

    expect(getByText('Jane Doe')).toBeTruthy();
    expect(getByText('she/her')).toBeTruthy();
    expect(getByText('Hello world')).toBeTruthy();
  });

  it('shows moderation actions when actor outranks target', () => {
    const { getByLabelText } = renderModal({ actorRole: 'admin' });

    expect(getByLabelText('Kick user')).toBeTruthy();
    expect(getByLabelText('Ban user')).toBeTruthy();
  });

  it('hides moderation actions when actor cannot act on target', () => {
    const { queryByLabelText } = renderModal({ actorRole: 'member' });

    expect(queryByLabelText('Kick user')).toBeNull();
    expect(queryByLabelText('Ban user')).toBeNull();
  });

  it('hides moderation actions for own profile', () => {
    const queryClient = createTestQueryClient();
    const actorMember = makeMember({ _id: 'member-actor', userId: ACTOR_USER_ID, role: 'admin' });
    queryClient.setQueryData(['users', ACTOR_USER_ID], { user: makeUser({ id: ACTOR_USER_ID }) });
    queryClient.setQueryData(['me'], { user: makeUser({ id: ACTOR_USER_ID }) });
    queryClient.setQueryData(['servers', SERVER_ID, 'members'], { members: [actorMember] });
    queryClient.setQueryData(['servers', SERVER_ID], { server: { _id: SERVER_ID, name: 'Test', ownerId: 'owner-999' } });

    useUiStore.setState({
      profileModal: { visible: true, userId: ACTOR_USER_ID, serverId: SERVER_ID },
    });

    const { queryByLabelText } = renderWithProviders(<UserProfileModal />, { queryClient });

    expect(queryByLabelText('Kick user')).toBeNull();
    expect(queryByLabelText('Ban user')).toBeNull();
  });

  it('calls closeProfileModal when Close is pressed', () => {
    const { getByLabelText } = renderModal();

    fireEvent.press(getByLabelText('Close profile'));

    expect(useUiStore.getState().profileModal.visible).toBe(false);
  });

  it('shows mute button for actor with mod permissions and opens duration dialog on press', () => {
    const { getByLabelText, getByText } = renderModal({ actorRole: 'admin' });

    const muteButton = getByLabelText('Mute user');
    expect(muteButton).toBeTruthy();
    fireEvent.press(muteButton);

    // After pressing Mute, the duration dialog should open showing duration options
    expect(getByText('Select mute duration:')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = renderWithProviders(<UserProfileModal />);
    expect(queryByTestId('user-profile-modal')).toBeNull();
  });
});
