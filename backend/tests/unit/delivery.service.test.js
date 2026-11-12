import { describe, it, expect } from 'vitest';
import { toDelivery } from '../../src/services/delivery.service.js';

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
