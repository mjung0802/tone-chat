import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { MessageInput } from './MessageInput';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('MessageInput', () => {
  it('renders input with accessibilityLabel', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    expect(getByLabelText('Message input')).toBeTruthy();
  });

  it('send button disabled when input is empty', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled).toBeTruthy();
  });

  it('send button disabled for whitespace-only text', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), '   ');
    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled).toBeTruthy();
  });

  it('send button enabled with real text', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
    const sendButton = getByLabelText('Send message');
    // When not disabled, accessibilityState.disabled is either false or undefined
    const isDisabled = sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled;
    expect(isDisabled).toBeFalsy();
  });

  it('pressing send calls onSend with trimmed text', () => {
    const onSend = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={onSend} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), '  Hello world  ');
    fireEvent.press(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Hello world');
  });

  it('pressing send clears input', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    const input = getByLabelText('Message input');
    fireEvent.changeText(input, 'Hello');
    fireEvent.press(getByLabelText('Send message'));

    expect(input.props.value).toBe('');
  });

  it('typing calls onTyping callback', () => {
    const onTyping = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} onTyping={onTyping} />,
    );

    fireEvent.changeText(getByLabelText('Message input'), 'H');

    expect(onTyping).toHaveBeenCalled();
  });

  it('no crash when onTyping is undefined', () => {
    const { getByLabelText } = renderWithProviders(
      <MessageInput onSend={jest.fn()} />,
    );

    // Should not throw
    fireEvent.changeText(getByLabelText('Message input'), 'Hello');
  });
});
