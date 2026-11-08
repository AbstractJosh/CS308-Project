import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuantityStepper, { clampQuantity } from '../src/components/QuantityStepper.jsx';

// Holds the quantity in state, like the product page does.
function Stepper({ max, disabled }) {
  const [qty, setQty] = useState(1);
  return <QuantityStepper value={qty} max={max} onChange={setQty} disabled={disabled} />;
}

const quantity = () => screen.getByLabelText('Quantity');
const minus = () => screen.getByRole('button', { name: 'Decrease quantity' });
const plus = () => screen.getByRole('button', { name: 'Increase quantity' });

describe('clampQuantity', () => {
  it('never goes below 1', () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(-3, 5)).toBe(1);
    expect(clampQuantity('abc', 5)).toBe(1);
  });

  it('never goes above the stock', () => {
    expect(clampQuantity(8, 5)).toBe(5);
    expect(clampQuantity(5, 5)).toBe(5);
  });

  it('never goes above 99, even with more stock', () => {
    expect(clampQuantity(150, 200)).toBe(99);
  });
});

describe('QuantityStepper', () => {
  it('starts at 1 and cannot go below 1', async () => {
    const user = userEvent.setup();
    render(<Stepper max={3} />);
    expect(quantity()).toHaveTextContent('1');
    expect(minus()).toBeDisabled();
    await user.click(minus());
    expect(quantity()).toHaveTextContent('1');
  });

  it('goes up to the stock and stops there', async () => {
    const user = userEvent.setup();
    render(<Stepper max={3} />);
    await user.click(plus());
    await user.click(plus());
    expect(quantity()).toHaveTextContent('3');
    expect(plus()).toBeDisabled();
    await user.click(plus());
    expect(quantity()).toHaveTextContent('3');
    await user.click(minus());
    expect(quantity()).toHaveTextContent('2');
  });

  it('disables both buttons when disabled', () => {
    render(<Stepper max={0} disabled />);
    expect(minus()).toBeDisabled();
    expect(plus()).toBeDisabled();
  });
});
