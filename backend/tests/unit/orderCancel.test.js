// SCRUM-81 (Ulukan): cancelling an order (req 14) and the open delivery list, on a fake
// database, so no PostgreSQL is needed. Every query is recorded so the tests can check what
// would be written.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fake = vi.hoisted(() => {
  const state = { rows: {}, calls: [] };
  const db = (table) => {
    const call = { table, ops: [] };
    state.calls.push(call);
    const step = (name) => (...args) => {
      call.ops.push([name, ...args]);
      return builder;
    };
    const builder = {
      where: step('where'),
      whereNot: step('whereNot'),
      join: step('join'),
      orderBy: step('orderBy'),
      forUpdate: step('forUpdate'),
      select: step('select'),
      first: async (...args) => {
        call.ops.push(['first', ...args]);
        return state.rows[table];
      },
      update: async (changes) => {
        call.ops.push(['update', changes]);
        return 1;
      },
      then: (resolve, reject) => Promise.resolve(state.rows[table]).then(resolve, reject),
    };
    return builder;
  };
  db.raw = (sql, bindings) => ({ sql, bindings });
  db.fn = { now: () => 'now()' };
  db.transaction = (work) => work(db);
  return { state, db };
});
vi.mock('../../src/db/knex.js', () => ({ default: fake.db }));

const { cancelOrder } = await import('../../src/services/order.service.js');
const { listDeliveries } = await import('../../src/services/delivery.service.js');

const CUSTOMER_ID = 7;
const orderRow = (status) => ({
  id: 3,
  userId: CUSTOMER_ID,
  status,
  total: '8677.00',
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  cardLast4: '4242',
  createdAt: '2026-11-27T10:00:00.000Z',
  deliveredAt: null,
});

const updates = () =>
  fake.state.calls.flatMap((call) =>
    call.ops.filter(([name]) => name === 'update').map(([, changes]) => ({ table: call.table, changes })),
  );

beforeEach(() => {
  fake.state.calls.length = 0;
  fake.state.rows = {
    orders: orderRow('PROCESSING'),
    order_items: [
      { productId: 12, quantity: 3 },
      { productId: 40, quantity: 2 },
    ],
    'order_items as oi': [],
    'deliveries as d': [],
  };
});

describe('cancelOrder', () => {
  it('cancels a PROCESSING order and puts every item back into stock', async () => {
    await cancelOrder(3, CUSTOMER_ID);

    // The order row is locked before anything is written.
    expect(fake.state.calls[0].ops).toContainEqual(['forUpdate']);
    expect(updates()).toEqual([
      { table: 'orders', changes: { status: 'CANCELLED', updated_at: 'now()' } },
      {
        table: 'products',
        changes: {
          quantity_in_stock: { sql: 'quantity_in_stock + ?', bindings: [3] },
          popularity: { sql: 'popularity - ?', bindings: [3] },
          updated_at: 'now()',
        },
      },
      {
        table: 'products',
        changes: {
          quantity_in_stock: { sql: 'quantity_in_stock + ?', bindings: [2] },
          popularity: { sql: 'popularity - ?', bindings: [2] },
          updated_at: 'now()',
        },
      },
    ]);
    const productIds = fake.state.calls.filter((c) => c.table === 'products').map((c) => c.ops[0][1].id);
    expect(productIds).toEqual([12, 40]);
  });

  it('answers 404 for an unknown order and writes nothing', async () => {
    fake.state.rows.orders = undefined;
    await expect(cancelOrder(99, CUSTOMER_ID)).rejects.toMatchObject({ status: 404, message: 'Order not found' });
    expect(updates()).toEqual([]);
  });

  it("answers 403 for another customer's order and writes nothing", async () => {
    await expect(cancelOrder(3, 8)).rejects.toMatchObject({ status: 403 });
    expect(updates()).toEqual([]);
  });

  it.each(['IN_TRANSIT', 'DELIVERED', 'CANCELLED'])('answers 400 for a %s order and writes nothing', async (status) => {
    fake.state.rows.orders = orderRow(status);
    await expect(cancelOrder(3, CUSTOMER_ID)).rejects.toMatchObject({
      status: 400,
      message: `This order is ${status}, so it can no longer be cancelled`,
    });
    expect(updates()).toEqual([]);
  });
});

// Luis's review of PR #32: deliveries of a cancelled order stay completed = false, so the
// "To deliver" list (completed=false) must leave them out.
describe('listDeliveries and cancelled orders', () => {
  const filters = () => fake.state.calls.at(-1).ops.filter(([name]) => name === 'where' || name === 'whereNot');

  it('leaves cancelled orders out of the open deliveries', async () => {
    await listDeliveries({ completed: false });
    expect(filters()).toEqual([
      ['where', 'd.completed', false],
      ['whereNot', 'o.status', 'CANCELLED'],
    ]);
  });

  it.each([[{}], [{ completed: true }]])('keeps every order for the filter %j', async (filter) => {
    await listDeliveries(filter);
    expect(filters().some(([name]) => name === 'whereNot')).toBe(false);
  });
});
