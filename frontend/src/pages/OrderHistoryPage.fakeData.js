const DEMO_ADDRESS = 'Sabancı University, Orta Mahalle, Tuzla, İstanbul';

export const fakeOrders = [
  {
    id: 21,
    status: 'PROCESSING',
    total: 79999,
    deliveryAddress: DEMO_ADDRESS,
    cardLast4: '4242',
    createdAt: '2026-11-10T14:20:00.000Z',
    deliveredAt: null,
    items: [{ id: 33, productId: 9, name: 'Jura E6 Piano Black', model: 'E6 (EC)', quantity: 1, unitPrice: 79999 }],
  },
  {
    id: 17,
    status: 'IN_TRANSIT',
    total: 7398,
    deliveryAddress: DEMO_ADDRESS,
    cardLast4: '4242',
    createdAt: '2026-11-07T09:05:00.000Z',
    deliveredAt: null,
    items: [
      { id: 27, productId: 40, name: 'Zassenhaus Manaos Hand Grinder', model: 'Manaos', quantity: 1, unitPrice: 4199 },
      { id: 28, productId: 48, name: 'Sage Descaler 4-pack', model: 'SES007', quantity: 1, unitPrice: 3199 },
    ],
  },
  {
    id: 14,
    status: 'DELIVERED',
    total: 51097,
    deliveryAddress: DEMO_ADDRESS,
    cardLast4: '4242',
    createdAt: '2026-10-28T18:40:00.000Z',
    deliveredAt: '2026-11-02T11:15:00.000Z',
    items: [
      { id: 22, productId: 5, name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: 49999 },
      {
        id: 23,
        productId: 31,
        name: 'Hola Sol Espresso Italiano Beans 250 g',
        model: 'Espresso Italiano 250 g',
        quantity: 2,
        unitPrice: 549,
      },
    ],
  },
  {
    id: 9,
    status: 'DELIVERED',
    total: 2636,
    deliveryAddress: DEMO_ADDRESS,
    cardLast4: '4242',
    createdAt: '2026-10-15T08:30:00.000Z',
    deliveredAt: '2026-10-19T16:00:00.000Z',
    items: [
      { id: 14, productId: 25, name: 'Bialetti Moka Express 1 Cup', model: 'Moka Express 1', quantity: 1, unitPrice: 1799 },
      { id: 15, productId: 34, name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: 279 },
    ],
  },
];

export const fakeOrdersApi = {
  list: async () => ({
    orders: [...fakeOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  }),
  get: async (id) => {
    const order = fakeOrders.find((item) => String(item.id) === String(id));
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
    return { order };
  },
};
