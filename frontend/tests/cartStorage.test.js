import { describe, it, expect } from 'vitest';
import {
  addGuestItem,
  buildCart,
  loadGuestItems,
  removeGuestItem,
  saveGuestItems,
  setGuestQuantity,
} from '../src/utils/cartStorage.js';

// SCRUM-71: the guest cart in localStorage (handbook 9.7). Same rules and messages as the cart API.
const grinder = {
  id: 40,
  name: 'Zassenhaus Manaos Hand Grinder',
  model: 'Manaos',
  serialNumber: 'CRM-GR-8004',
  price: 4199,
  imageCount: 4,
  quantityInStock: 3,
  description: 'not saved in the guest cart',
};

describe('guest cart', () => {
  it('adds a product with only the handbook 9.7 product fields', () => {
    const items = addGuestItem([], grinder, 2);
    expect(items).toEqual([
      {
        productId: 40,
        quantity: 2,
        product: { id: 40, name: grinder.name, model: 'Manaos', serialNumber: 'CRM-GR-8004', price: 4199, imageCount: 4, quantityInStock: 3 },
      },
    ]);
  });

  it('adds to the same line and caps the quantity at stock', () => {
    const items = addGuestItem(addGuestItem([], grinder, 2), grinder, 5);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('refuses a sold-out product and a line that already holds all the stock', () => {
    expect(() => addGuestItem([], { ...grinder, quantityInStock: 0 }, 1)).toThrow('This product is out of stock');
    expect(() => addGuestItem(addGuestItem([], grinder, 3), grinder, 1)).toThrow('Only 3 in stock');
  });

  it('sets a quantity up to stock and removes a line', () => {
    const items = addGuestItem([], grinder, 1);
    expect(setGuestQuantity(items, 40, 3)[0].quantity).toBe(3);
    expect(() => setGuestQuantity(items, 40, 4)).toThrow('Only 3 in stock');
    expect(removeGuestItem(items, 40)).toEqual([]);
  });

  it('saves to localStorage and ignores broken data', () => {
    saveGuestItems(addGuestItem([], grinder, 2));
    expect(loadGuestItems()[0].quantity).toBe(2);

    localStorage.setItem('crema_guest_cart', 'not json');
    expect(loadGuestItems()).toEqual([]);
    localStorage.setItem('crema_guest_cart', JSON.stringify([{ productId: 1, quantity: 0, product: {} }, { productId: 2 }]));
    expect(loadGuestItems()).toEqual([]);
  });

  it('builds the Cart object of handbook 8.1', () => {
    const cart = buildCart(addGuestItem([], grinder, 2));
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal).toBe(8398);
  });
});
