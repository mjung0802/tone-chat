import React from 'react';
import { makeMember } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MemberList } from './MemberList';

jest.mock('./MemberListItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MemberListItem: ({ member, isOwner }: { member: { userId: string }; isOwner?: boolean }) => (
      <Text testID={`member-${member.userId}`}>
        {isOwner ? 'owner' : 'member'}
      </Text>
    ),
  };
});

describe('MemberList', () => {
  it('renders all members', () => {
    const members = [
      makeMember({ _id: 'm1', userId: 'user-1' }),
      makeMember({ _id: 'm2', userId: 'user-2' }),
      makeMember({ _id: 'm3', userId: 'user-3' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MemberList members={members} />,
    );

    expect(getByTestId('member-user-1')).toBeTruthy();
    expect(getByTestId('member-user-2')).toBeTruthy();
    expect(getByTestId('member-user-3')).toBeTruthy();
  });

  it('passes isOwner=true to the member matching ownerId', () => {
    const members = [
      makeMember({ _id: 'm1', userId: 'user-1' }),
      makeMember({ _id: 'm2', userId: 'user-2' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MemberList members={members} ownerId="user-2" />,
    );

    expect(getByTestId('member-user-1').props.children).toBe('member');
    expect(getByTestId('member-user-2').props.children).toBe('owner');
  });
});
