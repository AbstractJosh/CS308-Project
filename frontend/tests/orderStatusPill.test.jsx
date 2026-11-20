import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderStatusPill from '../src/components/OrderStatusPill.jsx';

describe('OrderStatusPill', () => {
  it.each([
    ['PROCESSING', 'Processing', 'status-processing'],
    ['IN_TRANSIT', 'In transit', 'status-in-transit'],
    ['DELIVERED', 'Delivered', 'status-delivered'],
    ['CANCELLED', 'Cancelled', 'status-cancelled'],
  ])('shows %s as %s with its own colour class', (status, label, className) => {
    render(<OrderStatusPill status={status} />);
    const pill = screen.getByText(label);
    expect(pill).toHaveClass('status-pill', className);
    expect(pill.className).toBe(`status-pill ${className}`);
  });

  it('shows an unknown status as it is with only the base class', () => {
    render(<OrderStatusPill status="RETURNED" />);
    const pill = screen.getByText('RETURNED');
    expect(pill.className).toBe('status-pill');
  });
});
