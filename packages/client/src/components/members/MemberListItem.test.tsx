import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { makeMember } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MemberListItem } from './MemberListItem';

describe('MemberListItem', () => {
  it('renders regular member without a badge', () => {
    const member = makeMember({ role: 'member' });
    const { getByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} displayName="Test User" />,
    );

    expect(getByText('Test User')).toBeTruthy();
    expect(queryByText('Admin')).toBeNull();
    expect(queryByText('Owner')).toBeNull();
    expect(queryByText('Mod')).toBeNull();
  });

  it('shows Admin badge for admin member', () => {
    const member = makeMember({ role: 'admin' });
    const { getAllByText } = renderWithProviders(
      <MemberListItem member={member} />,
    );

    // "Admin" appears in both description and chip
    expect(getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Owner badge when isOwner is true', () => {
    const member = makeMember({ role: 'member' });
    const { getAllByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} isOwner />,
    );

    expect(getAllByText('Owner').length).toBeGreaterThanOrEqual(1);
    expect(queryByText('Admin')).toBeNull();
  });

  it('shows Owner badge instead of Admin when member is both owner and admin', () => {
    const member = makeMember({ role: 'admin' });
    const { getAllByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} isOwner />,
    );

    expect(getAllByText('Owner').length).toBeGreaterThanOrEqual(1);
    expect(queryByText('Admin')).toBeNull();
  });

  it('shows Mod badge for mod member', () => {
    const member = makeMember({ role: 'mod' });
    const { getAllByText } = renderWithProviders(
      <MemberListItem member={member} />,
    );

    expect(getAllByText('Mod').length).toBeGreaterThanOrEqual(1);
  });

  it('shows muted indicator when mutedUntil is in the future', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const member = makeMember({ mutedUntil: futureDate });
    const { getByText } = renderWithProviders(
      <MemberListItem member={member} />,
    );

    expect(getByText('Muted')).toBeTruthy();
  });

  it('renders action buttons when actor is admin viewing a regular member', () => {
    const member = makeMember({ role: 'member', userId: 'target-user' });
    const onKick = jest.fn();
    const onBan = jest.fn();

    const { getByLabelText } = renderWithProviders(
      <MemberListItem
        member={member}
        actorRole="admin"
        actorIsOwner={false}
        onKick={onKick}
        onBan={onBan}
      />,
    );

    expect(getByLabelText('Kick')).toBeTruthy();
    expect(getByLabelText('Ban')).toBeTruthy();
    expect(getByLabelText('Mute')).toBeTruthy();
    expect(getByLabelText('Promote to Mod')).toBeTruthy();
  });

  it('does not render action buttons when no actorRole is provided', () => {
    const member = makeMember({ role: 'member' });

    const { queryByLabelText } = renderWithProviders(
      <MemberListItem member={member} />,
    );

    expect(queryByLabelText('Kick')).toBeNull();
    expect(queryByLabelText('Ban')).toBeNull();
  });

  it('does not render action buttons for the owner', () => {
    const member = makeMember({ role: 'admin' });

    const { queryByLabelText } = renderWithProviders(
      <MemberListItem
        member={member}
        isOwner
        actorRole="admin"
        actorIsOwner={false}
      />,
    );

    // Actor is admin but target is owner — no actions available
    expect(queryByLabelText('Kick')).toBeNull();
    expect(queryByLabelText('Ban')).toBeNull();
  });

  it('shows transfer ownership button when actor is owner viewing an admin', () => {
    const member = makeMember({ role: 'admin', userId: 'target-user' });

    const { getByLabelText } = renderWithProviders(
      <MemberListItem
        member={member}
        actorRole="admin"
        actorIsOwner
        onTransferOwnership={jest.fn()}
      />,
    );

    expect(getByLabelText('Transfer Ownership')).toBeTruthy();
  });

  it('calls onKick callback with member when kick button is pressed', () => {
    const member = makeMember({ role: 'member', userId: 'target-user' });
    const onKick = jest.fn();

    const { getByLabelText } = renderWithProviders(
      <MemberListItem
        member={member}
        actorRole="admin"
        actorIsOwner={false}
        onKick={onKick}
      />,
    );

    const kickBtn = getByLabelText('Kick');
    fireEvent(kickBtn, 'click');
    expect(onKick).toHaveBeenCalledWith(member);
  });

  it('shows unmute button instead of mute when member is muted', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const member = makeMember({ role: 'member', mutedUntil: futureDate });

    const { getByLabelText, queryByLabelText } = renderWithProviders(
      <MemberListItem
        member={member}
        actorRole="admin"
        actorIsOwner={false}
        onMute={jest.fn()}
        onUnmute={jest.fn()}
      />,
    );

    expect(getByLabelText('Unmute')).toBeTruthy();
    expect(queryByLabelText('Mute')).toBeNull();
  });
});
