import { useState } from 'react';

// FAKE DATA for the cart page (SCRUM-52). Owner: Sezin.
// CartContext and the cart API are not ready yet, so the page uses this hook for now.
// useFakeCart() returns the same shape as useCart() in handbook 9.7, so switching later
// only means changing the import in CartPage.jsx. Delete this file then.

// Real products from the seed (handbook Appendix A). The product object has the fields a
// guest cart keeps in localStorage (handbook 9.7, crema_guest_cart).
export const fakeCartItems = [
  {
    productId: 3,
    quantity: 1,
    product: {
      id: 3,
      name: 'Sage The Barista Express Impress',
      model: 'SES876 BSS',
      serialNumber: 'CRM-EM-1003',
      price: 99999,
      imageCount: 8,
      quantityInStock: 9,
    },
  },
  {
    productId: 40,
    quantity: 2,
    product: {
      id: 40,
      name: 'Zassenhaus Manaos Hand Grinder',
      model: 'Manaos',
      serialNumber: 'CRM-GR-8004',
      price: 4199,
      imageCount: 4,
      quantityInStock: 14,
    },
  },
  {
    productId: 45,
    quantity: 1,
    product: {
      id: 45,
      name: 'Bialetti Thermos 750 ml Grey',
      model: 'Thermos 750 ml',
      serialNumber: 'CRM-SV-9005',
      price: 1799,
      imageCount: 1,
      quantityInStock: 22,
    },
  },
];

// Builds the Cart object of handbook 8.1: { items, itemCount, subtotal }.
// itemCount counts units (2 grinders = 2), subtotal is rounded to 2 decimals.
export function buildCart(items) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return { items, itemCount, subtotal: Math.round(subtotal * 100) / 100 };
}

// Fake version of useCart(): the cart lives in React state, so it resets on reload.
export function useFakeCart(initialItems = fakeCartItems) {
  const [items, setItems] = useState(initialItems);

  return {
    cart: buildCart(items),
    ready: true,
    updateQuantity: (productId, quantity) =>
      setItems((current) =>
        current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
      ),
    removeItem: (productId) =>
      setItems((current) => current.filter((item) => item.productId !== productId)),
  };
}
