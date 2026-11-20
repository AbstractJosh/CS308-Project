import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';

// SCRUM-51 (Murat): GET /invoices/:id/pdf from the route all the way to the PDF bytes.
// Only the database is faked; the real controller, invoice service, owner check and PDF
// builder run, so these tests show the parts work together (handbook 7.6, req 4).
const fake = vi.hoisted(() => {
  const state = { rows: {} };
  const db = () => {
    let table;
    const builder = {
      join: () => builder,
      orderBy: () => builder,
      where: () => builder,
      first: async () => state.rows[table],
      select: async () => state.rows[table],
    };
    return (name) => {
      table = name;
      return builder;
    };
  };
  return { state, db: (name) => db()(name) };
});
vi.mock('../../src/db/knex.js', () => ({ default: fake.db }));

const OWNER_ID = 1;
const bearer = (id, role) => ({ Authorization: `Bearer ${signToken({ id, role })}` });

beforeEach(() => {
  fake.state.rows = {
    'invoices as i': {
      id: 7,
      orderId: 123,
      invoiceNumber: 'INV-000123',
      total: '50836.00',
      createdAt: new Date('2026-11-13T08:30:00Z'),
      userId: OWNER_ID,
      deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
      cardLast4: '4242',
      name: 'Demo Customer',
      email: 'customer@crema.com',
      taxId: '1234567890',
    },
    'order_items as oi': [
      { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' },
      { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: '279.00' },
    ],
  };
});

describe('invoice PDF, end to end', () => {
  it('gives the customer who ordered a real PDF file', async () => {
    const res = await request(app).get('/api/invoices/7/pdf').set(bearer(OWNER_ID, 'CUSTOMER'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="INV-000123.pdf"');
    const body = Buffer.from(res.body);
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    // The PDF was built from this invoice: its title holds the invoice number.
    expect(body.toString('latin1')).toContain('(Crema & Co. invoice INV-000123)');
  });

  it.each(['PRODUCT_MANAGER', 'SALES_MANAGER'])('gives the PDF to a %s', async (role) => {
    const res = await request(app).get('/api/invoices/7/pdf').set(bearer(50, role));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it.each([
    ['another customer', 2, 'CUSTOMER'],
    ['a support agent', 60, 'SUPPORT_AGENT'],
  ])('answers 403 to %s and sends no PDF', async (_who, id, role) => {
    const res = await request(app).get('/api/invoices/7/pdf').set(bearer(id, role));
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'You do not have permission to do this' });
  });

  it('answers 404 when the invoice does not exist', async () => {
    fake.state.rows['invoices as i'] = undefined;
    const res = await request(app).get('/api/invoices/999/pdf').set(bearer(OWNER_ID, 'CUSTOMER'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Invoice not found' });
  });
});
