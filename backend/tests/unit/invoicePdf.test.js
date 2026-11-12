// SCRUM-48 (Murat): the invoice PDF helper. Pure functions, no database.
import { describe, it, expect } from 'vitest';
import {
  buildInvoicePdf,
  formatInvoiceDate,
  formatTRY,
  invoiceContent,
  invoiceNumberFor,
} from '../../src/utils/invoicePdf.js';

// An invoice as the caller will pass it; money as strings, like pg returns DECIMAL.
const invoice = {
  invoiceNumber: 'INV-000123',
  createdAt: '2026-11-12T08:30:00Z',
  customer: { name: 'Demo Customer', email: 'customer@crema.com', taxId: '1234567890' },
  deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
  cardLast4: '4242',
  items: [
    { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' },
    { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: '279.00' },
  ],
  total: '50836.00',
};

describe('invoice formatting helpers', () => {
  it('formats money like the frontend: ₺ sign, thousands commas, 2 decimals', () => {
    expect(formatTRY(12499)).toBe('₺12,499.00');
    expect(formatTRY('279.5')).toBe('₺279.50');
    expect(formatTRY(959999)).toBe('₺959,999.00');
  });

  it('builds invoice numbers as INV- plus the order id padded to 6 digits', () => {
    expect(invoiceNumberFor(123)).toBe('INV-000123');
    expect(invoiceNumberFor(1)).toBe('INV-000001');
    expect(invoiceNumberFor(1234567)).toBe('INV-1234567');
  });

  it('prints the date in Istanbul time', () => {
    expect(formatInvoiceDate('2026-11-12T08:30:00Z')).toBe('12 November 2026');
    // 23:30 UTC on 11 November is already 12 November in Istanbul (UTC+3).
    expect(formatInvoiceDate('2026-11-11T23:30:00Z')).toBe('12 November 2026');
  });
});

describe('invoiceContent', () => {
  const content = invoiceContent(invoice);

  it('contains every field handbook 7.6 asks for', () => {
    expect(content.invoiceNumber).toBe('INV-000123');
    expect(content.date).toBe('12 November 2026');
    expect(content.billedTo).toEqual(['Demo Customer', 'customer@crema.com', 'Tax ID: 1234567890']);
    expect(content.deliveryAddress).toBe('Sabancı University, Orta Mahalle, Tuzla, İstanbul');
    expect(content.total).toBe('₺50,836.00');
  });

  it('shows quantity, unit price and line total for each item', () => {
    expect(content.rows).toEqual([
      { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: '1', unitPrice: '₺49,999.00', lineTotal: '₺49,999.00' },
      { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: '3', unitPrice: '₺279.00', lineTotal: '₺837.00' },
    ]);
  });

  it('never shows more than the last 4 card digits', () => {
    expect(content.payment).toBe('Card ending 4242');
    // Even if a caller passed a full number by mistake, only the last 4 digits are printed.
    expect(invoiceContent({ ...invoice, cardLast4: '4242424242424242' }).payment).toBe('Card ending 4242');
  });
});

describe('buildInvoicePdf', () => {
  it('resolves with a one-page PDF file', async () => {
    const pdf = await buildInvoicePdf(invoice);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1);
  });

  it('embeds the Plus Jakarta Sans font so ı, İ, ş, ğ and ₺ print correctly', async () => {
    const pdf = (await buildInvoicePdf(invoice)).toString('latin1');
    expect(pdf).toContain('PlusJakartaSans-Regular');
    expect(pdf).toContain('PlusJakartaSans-Bold');
  });

  it('continues on a second page when there are many items', async () => {
    const items = Array.from({ length: 40 }, () => invoice.items[0]);
    const pdf = (await buildInvoicePdf({ ...invoice, items })).toString('latin1');
    expect(pdf.match(/\/Type \/Page\b/g).length).toBeGreaterThan(1);
  });
});
