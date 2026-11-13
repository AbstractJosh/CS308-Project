// SCRUM-51 (Murat): the invoice email from the database row to the finished email.
// The real invoice service, PDF builder, email service and nodemailer run. Only two things
// are faked: the database, and nodemailer's network step, which is replaced by its own
// "stream" transport that builds the complete email but sends it nowhere.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fake = vi.hoisted(() => {
  const state = { rows: {}, writes: [], mailFails: false };
  const chain = (table) => {
    const builder = {
      join: () => builder,
      orderBy: () => builder,
      where: () => builder,
      first: async () => state.rows[table],
      select: async () => state.rows[table],
      // Any write to the database is recorded; the email step must never make one.
      insert: async () => state.writes.push(['insert', table]),
      update: async () => state.writes.push(['update', table]),
      del: async () => state.writes.push(['delete', table]),
    };
    return builder;
  };
  return { state, db: chain };
});
vi.mock('../../src/db/knex.js', () => ({ default: fake.db }));
vi.mock('../../src/config/env.js', () => ({
  env: { smtp: { host: 'smtp.crema.test', port: 587, user: '', pass: '', from: 'Crema & Co. <no-reply@crema.com>' } },
}));
vi.mock('nodemailer', async (importOriginal) => {
  const real = (await importOriginal()).default;
  return {
    default: {
      ...real,
      createTransport: () => {
        if (fake.state.mailFails) {
          return { sendMail: async () => Promise.reject(new Error('554 Mailbox unavailable')) };
        }
        return real.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
      },
    },
  };
});

const nodemailer = (await import('nodemailer')).default;
const sentMail = vi.spyOn(nodemailer, 'getTestMessageUrl').mockReturnValue(false);

// Each test loads fresh copies, because the email service keeps its transporter in memory.
async function loadServices() {
  vi.resetModules();
  return import('../../src/services/invoice.service.js');
}

// Splits a raw email into its parts: [{ headers, body }].
function mimeParts(raw) {
  const boundary = raw.match(/boundary="([^"]+)"/)[1];
  return raw
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => {
      const [headers, ...body] = part.trim().split('\n\n');
      return { headers, body: body.join('\n\n') };
    });
}

beforeEach(() => {
  fake.state.writes.length = 0;
  fake.state.mailFails = false;
  fake.state.rows = {
    'invoices as i': {
      id: 7,
      orderId: 123,
      invoiceNumber: 'INV-000123',
      total: '49999.00',
      createdAt: new Date('2026-11-13T08:30:00Z'),
      userId: 1,
      deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
      cardLast4: '4242',
      name: 'Demo Customer',
      email: 'customer@crema.com',
      taxId: '1234567890',
    },
    'order_items as oi': [{ name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' }],
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  sentMail.mockClear();
});

describe('invoice email, end to end', () => {
  it('builds a real email to the customer with the invoice PDF attached', async () => {
    // Catch the finished email that the stream transport produces.
    const realCreate = nodemailer.createTransport;
    let raw = '';
    vi.spyOn(nodemailer, 'createTransport').mockImplementation((options) => {
      const transport = realCreate(options);
      return {
        sendMail: async (message) => {
          const info = await transport.sendMail(message);
          raw = info.message.toString();
          return info;
        },
      };
    });
    const { sendInvoiceForOrder } = await loadServices();

    await expect(sendInvoiceForOrder(123)).resolves.toBe(true);

    expect(raw).toContain('From: "Crema & Co." <no-reply@crema.com>');
    expect(raw).toContain('To: customer@crema.com');
    expect(raw).toContain('Subject: Your Crema & Co. invoice INV-000123');

    const [text, attachment] = mimeParts(raw);
    expect(text.headers).toContain('Content-Type: text/plain');
    expect(text.body).toContain('Hi Demo Customer');
    expect(attachment.headers).toContain('Content-Type: application/pdf; name=INV-000123.pdf');
    expect(attachment.headers).toContain('Content-Disposition: attachment; filename=INV-000123.pdf');
    // The attachment, decoded, is a real PDF.
    const pdf = Buffer.from(attachment.body.replace(/\s/g, ''), 'base64');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    vi.mocked(nodemailer.createTransport).mockRestore();
  });

  it('returns false when the mail server refuses the email, without throwing', async () => {
    fake.state.mailFails = true;
    const { sendInvoiceForOrder } = await loadServices();

    await expect(sendInvoiceForOrder(123)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('Invoice email for order 123 was not sent: 554 Mailbox unavailable');
  });

  it('keeps the order: a failed email never writes to the database', async () => {
    fake.state.mailFails = true;
    const { sendInvoiceForOrder } = await loadServices();

    await sendInvoiceForOrder(123);

    // No delete, update or insert on orders, invoices or anything else: the saved order stays.
    expect(fake.state.writes).toEqual([]);
  });

  it('keeps the order when sending works too: emailing only reads', async () => {
    const { sendInvoiceForOrder } = await loadServices();
    await sendInvoiceForOrder(123);
    expect(fake.state.writes).toEqual([]);
  });
});
