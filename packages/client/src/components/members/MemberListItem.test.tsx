import React from 'react';
import { makeMember } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MemberListItem } from './MemberListItem';

describe('MemberListItem', () => {
  it('renders regular member without a badge', () => {
    const member = makeMember({ roles: [] });
    const { getByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} displayName="Test User" />,
    );

    expect(getByText('Test User')).toBeTruthy();
    expect(queryByText('Admin')).toBeNull();
    expect(queryByText('Owner')).toBeNull();
  });

  it('shows Admin badge for admin member', () => {
    const member = makeMember({ roles: ['admin'] });
    const { getAllByText } = renderWithProviders(
      <MemberListItem member={member} />,
    );

    // "Admin" appears in both description and chip
    expect(getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Owner badge when isOwner is true', () => {
    const member = makeMember({ roles: [] });
    const { getAllByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} isOwner />,
    );

    expect(getAllByText('Owner').length).toBeGreaterThanOrEqual(1);
    expect(queryByText('Admin')).toBeNull();
  });

  it('shows Owner badge instead of Admin when member is both owner and admin', () => {
    const member = makeMember({ roles: ['admin'] });
    const { getAllByText, queryByText } = renderWithProviders(
      <MemberListItem member={member} isOwner />,
    );

    expect(getAllByText('Owner').length).toBeGreaterThanOrEqual(1);
    expect(queryByText('Admin')).toBeNull();
  });
});
