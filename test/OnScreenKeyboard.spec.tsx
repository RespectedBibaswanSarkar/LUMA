import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {OnScreenKeyboard} from '../src/components/OnScreenKeyboard';

describe('OnScreenKeyboard', () => {
  it('supports uppercase letters and punctuation through focusable keys', () => {
    const onChange = jest.fn();
    const view = render(
      <OnScreenKeyboard value="" onChange={onChange} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.press(view.getByTestId('key-shift'));
    expect(view.getByTestId('key-a').props.accessibilityLabel).toBe('Type A');
    fireEvent.press(view.getByTestId('key-a'));
    fireEvent.press(view.getByTestId('key-symbol-?'));

    expect(onChange).toHaveBeenNthCalledWith(1, 'A');
    expect(onChange).toHaveBeenNthCalledWith(2, '?');
  });

  it('allows the submit action to describe its context', () => {
    const view = render(
      <OnScreenKeyboard
        value="Guest"
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        submitLabel="Save name"
        submitAccessibilityLabel="Save member name"
      />,
    );

    expect(view.getByText('Save name')).toBeTruthy();
    expect(view.getByTestId('key-send').props.accessibilityLabel).toBe('Save member name');
  });
});
