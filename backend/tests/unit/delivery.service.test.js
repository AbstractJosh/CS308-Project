import { describe, it, expect } from 'vitest';
import { NEXT_STATUS, moveError, toDelivery } from '../../src/services/delivery.service.js';

// SCRUM-57: one deliveries row (joined with its order and product) in the handbook 8.3 shape.
describe('toDelivery', () => {
  it('keeps the handbook fields and turns DECIMAL strings into numbers', () => {
    const row = {
      id: 5,
      orderId: 3,
      customerId: 1,
      productId: 40,
      productName: 'Zassenhaus Manaos Hand Grinder',
      quantity: 2,
      totalPrice: '8398.00',
      deliveryAddress: 'Tuzla, Istanbul',
      completed: false,
      orderStatus: 'PROCESSING',
      somethingElse: 'not sent',
    };
    expect(toDelivery(row)).toEqual({
      id: 5,
      orderId: 3,
      customerId: 1,
      productId: 40,
      productName: 'Zassenhaus Manaos Hand Grinder',
      quantity: 2,
      totalPrice: 8398,
      deliveryAddress: 'Tuzla, Istanbul',
      completed: false,
      orderStatus: 'PROCESSING',
    });
  });

  it('marks a delivered row as completed', () => {
    expect(toDelivery({ id: 1, quantity: 1, totalPrice: '10.50', completed: true, orderStatus: 'DELIVERED' })).toMatchObject({
      totalPrice: 10.5,
      completed: true,
      orderStatus: 'DELIVERED',
    });
  });
});

// SCRUM-60: which moves are allowed, and the 400 message for the others (handbook 7.5).
describe('order status moves', () => {
  it('only allows one step forward', () => {
    expect(NEXT_STATUS).toEqual({ PROCESSING: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' });
  });

  it.each([
    ['PROCESSING', 'DELIVERED', 'This order is PROCESSING, so it can only be moved to IN_TRANSIT, not DELIVERED'],
    ['IN_TRANSIT', 'IN_TRANSIT', 'This order is IN_TRANSIT, so it can only be moved to DELIVERED, not IN_TRANSIT'],
    ['DELIVERED', 'IN_TRANSIT', 'This order is DELIVERED and cannot be moved any more'],
    ['CANCELLED', 'DELIVERED', 'This order is CANCELLED and cannot be moved any more'],
  ])('explains why %s cannot go to %s', (current, wanted, message) => {
    expect(moveError(current, wanted)).toBe(message);
  });
});
