import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { getMentionQuery, MentionAutocomplete } from './MentionAutocomplete';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeMember } from '../../test-utils/fixtures';

describe('getMentionQuery', () => {
  it('returns query when @ is at start of text', () => {
    const result = getMentionQuery('@ali', 4);
    expect(result).toEqual({ query: 'ali', start: 0, end: 4 });
  });

  it('returns query when @ follows whitespace', () => {
    const result = getMentionQuery('hello @bob', 10);
    expect(result).toEqual({ query: 'bob', start: 6, end: 10 });
  });

  it('returns null when @ is mid-word', () => {
    const result = getMentionQuery('email@test', 10);
    expect(result).toBeNull();
  });

  it('returns empty query when cursor is right after @', () => {
    const result = getMentionQuery('@', 1);
    expect(result).toEqual({ query: '', start: 0, end: 1 });
  });

  it('returns null when no @ is present', () => {
    const result = getMentionQuery('hello world', 11);
    expect(result).toBeNull();
  });

  it('returns null when cursor is before @', () => {
    const result = getMentionQuery('hi @bob', 2);
    expect(result).toBeNull();
  });

  it('returns null when whitespace follows @', () => {
    const result = getMentionQuery('@ alice', 3);
    expect(result).toBeNull();
  });

  it('handles cursor in the middle of a mention', () => {
    const result = getMentionQuery('@alice', 3);
    expect(result).toEqual({ query: 'al', start: 0, end: 3 });
  });

  it('returns query for @ after newline-like whitespace', () => {
    const result = getMentionQuery('hey\n@bob', 8);
    expect(result).toEqual({ query: 'bob', start: 4, end: 8 });
  });
});

describe('MentionAutocomplete', () => {
  const members = [
    makeMember({ userId: 'u1', username: 'alice', display_name: 'Alice A' }),
    makeMember({ userId: 'u2', username: 'bob', display_name: 'Bob B' }),
    makeMember({ userId: 'u3', username: 'charlie', display_name: 'Charlie C' }),
    makeMember({ userId: 'current', username: 'me', display_name: 'Me' }),
  ];

  it('returns null when no mention query is active', () => {
    const { queryByRole } = renderWithProviders(
      <MentionAutocomplete
        text="hello"
        cursorPosition={5}
        members={members}
        onSelect={jest.fn()}
      />,
    );
    expect(queryByRole('button')).toBeNull();
  });

  it('shows matching members when @ query is active', () => {
    const { getByText } = renderWithProviders(
      <MentionAutocomplete
        text="@ali"
        cursorPosition={4}
        members={members}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Alice A')).toBeTruthy();
  });

  it('filters members by query', () => {
    const { getByText, queryByText } = renderWithProviders(
      <MentionAutocomplete
        text="@bob"
        cursorPosition={4}
        members={members}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Bob B')).toBeTruthy();
    expect(queryByText('Alice A')).toBeNull();
  });

  it('excludes currentUserId from results', () => {
    const { queryByText } = renderWithProviders(
      <MentionAutocomplete
        text="@"
        cursorPosition={1}
        members={members}
        onSelect={jest.fn()}
        currentUserId="current"
      />,
    );
    expect(queryByText('Me')).toBeNull();
  });

  it('calls onSelect with member and range when pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = renderWithProviders(
      <MentionAutocomplete
        text="@ali"
        cursorPosition={4}
        members={members}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByText('Alice A'));
    expect(onSelect).toHaveBeenCalledWith(
      members[0],
      0,
      4,
    );
  });

  it('shows up to MAX_RESULTS (5) members', () => {
    const manyMembers = Array.from({ length: 10 }, (_, i) =>
      makeMember({ userId: `u${i}`, username: `user${i}`, display_name: `User ${i}` }),
    );
    const { getAllByRole } = renderWithProviders(
      <MentionAutocomplete
        text="@user"
        cursorPosition={5}
        members={manyMembers}
        onSelect={jest.fn()}
      />,
    );
    expect(getAllByRole('button').length).toBeLessThanOrEqual(5);
  });

  it('returns null when query matches no members', () => {
    const { queryByRole } = renderWithProviders(
      <MentionAutocomplete
        text="@zzz"
        cursorPosition={4}
        members={members}
        onSelect={jest.fn()}
      />,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
