import { renderHook } from '@testing-library/react-native';
import { useMemo } from 'react';

// Simulates: useMemo(..., [unmuteMember]) — the CURRENT (broken) deps
function useMemoWithFullObject(mutationObj: { mutate: () => void; isPending: boolean }) {
  return useMemo(
    () => ({ action: () => mutationObj.mutate() }),
    [mutationObj], // full object — new ref each render
  );
}

// Simulates: useMemo(..., [unmuteMember.mutate]) — the FIXED deps
function useMemoWithStableFn(mutationObj: { mutate: () => void; isPending: boolean }) {
  return useMemo(
    () => ({ action: () => mutationObj.mutate() }),
    [mutationObj.mutate], // stable fn reference
  );
}

type MutationProps = { mutation: { mutate: () => void; isPending: boolean } };

describe('modActionsMap memoization', () => {
  it('BROKEN: rebuilds when only isPending changes (full object dep)', () => {
    const mutateFn = jest.fn();
    const { result, rerender } = renderHook<{ action: () => void }, MutationProps>(
      ({ mutation }) => useMemoWithFullObject(mutation),
      { initialProps: { mutation: { mutate: mutateFn, isPending: false } } },
    );
    const first = result.current;
    rerender({ mutation: { mutate: mutateFn, isPending: true } }); // isPending flip = new object ref
    expect(result.current).not.toBe(first); // recomputed — confirms the bug
  });

  it('FIXED: stays stable when only isPending changes (mutate fn dep)', () => {
    const mutateFn = jest.fn();
    const { result, rerender } = renderHook<{ action: () => void }, MutationProps>(
      ({ mutation }) => useMemoWithStableFn(mutation),
      { initialProps: { mutation: { mutate: mutateFn, isPending: false } } },
    );
    const first = result.current;
    rerender({ mutation: { mutate: mutateFn, isPending: true } }); // isPending flip = new object ref
    expect(result.current).toBe(first); // same reference — stable
  });
});
