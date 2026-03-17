import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TonePicker } from './TonePicker';
import { BASE_TONES } from '../../tone/toneRegistry';

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, Pressable } = require('react-native');
  return {
    Text: (props: { children?: React.ReactNode }) => <Text {...props} />,
    IconButton: (props: { onPress?: () => void; accessibilityLabel?: string }) => <Pressable onPress={props.onPress} accessibilityLabel={props.accessibilityLabel} accessibilityRole="button"><Text>X</Text></Pressable>,
    useTheme: () => ({
      colors: {
        surfaceVariant: '#e7e0ec',
        onSurfaceVariant: '#49454e',
      },
    }),
  };
});

describe('TonePicker', () => {
  it('renders all base tones when visible', () => {
    const { getAllByRole } = render(
      <TonePicker visible onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );
    const buttons = getAllByRole('button');
    // base tones + close button
    expect(buttons.length).toBe(BASE_TONES.length + 1);
  });

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <TonePicker visible={false} onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onSelect with tone key when tone is pressed', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <TonePicker visible onSelect={onSelect} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('joking tone'));
    expect(onSelect).toHaveBeenCalledWith('j');
  });

  it('renders custom tones alongside base tones', () => {
    const customTones = [
      { key: 'uwu', label: 'uwu', emoji: '\u{1F97A}', colorLight: '#ff00ff', colorDark: '#ff88ff', textStyle: 'normal' as const },
    ];
    const { getAllByRole } = render(
      <TonePicker visible onSelect={jest.fn()} onDismiss={jest.fn()} customTones={customTones} />,
    );
    const buttons = getAllByRole('button');
    // base tones + 1 custom + close button
    expect(buttons.length).toBe(BASE_TONES.length + 1 + 1);
  });
});
