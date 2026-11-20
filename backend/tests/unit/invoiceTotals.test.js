// SCRUM-51 (Murat): invoice totals. The money printed on the invoice must be exact to the
// kuruş: no floating point leftovers, line totals that add up to the total.
import { describe, it, expect } from 'vitest';
import { invoiceContent } from '../../src/utils/invoicePdf.js';

// "₺51,876.00" -> 51876
const toNumber = (text) => Number(text.replace(/[₺,]/g, ''));

function invoiceWith(items, total) {
  return {
    invoiceNumber: 'INV-000123',
    createdAt: '2026-11-13T08:30:00Z',
    customer: { name: 'Demo Customer', email: 'customer@crema.com', taxId: '1234567890' },
    deliveryAddress: 'Tuzla, İstanbul',
    cardLast4: '4242',
    items,
    total,
  };
}

describe('invoice totals', () => {
  it('multiplies prices with kuruş exactly (19.99 x 3 is 59.97, not 59.970000000000006)', () => {
    const { rows } = invoiceContent(invoiceWith([{ name: 'A', model: 'A', quantity: 3, unitPrice: '19.99' }], '59.97'));
    expect(rows[0].lineTotal).toBe('₺59.97');
    const small = invoiceContent(invoiceWith([{ name: 'B', model: 'B', quantity: 3, unitPrice: '0.10' }], '0.30'));
    expect(small.rows[0].lineTotal).toBe('₺0.30');
  });

  it('has line totals that add up to the invoice total for a real catalog order', () => {
    // Sage The Bambino Plus x1, Hola Sol Turkish Coffee x3, Coach Coffee Huila Lucero x2 (Appendix A prices).
    const content = invoiceContent(
      invoiceWith(
        [
          { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' },
          { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: '279.00' },
          { name: 'Coach Coffee Colombia Huila Lucero Beans 250 g', model: 'Huila Lucero 250 g', quantity: 2, unitPrice: '520.00' },
        ],
        '51876.00',
      ),
    );
    expect(content.rows.map((r) => r.lineTotal)).toEqual(['₺49,999.00', '₺837.00', '₺1,040.00']);
    const sum = content.rows.reduce((total, row) => total + toNumber(row.lineTotal), 0);
    expect(sum).toBe(51876);
    expect(content.total).toBe('₺51,876.00');
  });

  it('prints the total stored with the invoice, the amount that was actually charged', () => {
    // The invoice total is copied from the order at sale time; it is printed as stored,
    // even if the same items would cost something else today.
    const content = invoiceContent(
      invoiceWith([{ name: 'A', model: 'A', quantity: 1, unitPrice: '100.00' }], '100.00'),
    );
    expect(content.total).toBe('₺100.00');
  });

  it('formats large amounts with thousands separators', () => {
    const content = invoiceContent(
      invoiceWith([{ name: 'Jura GIGA X8c', model: 'GIGA X8c', quantity: 2, unitPrice: '959999.00' }], '1919998.00'),
    );
    expect(content.rows[0].lineTotal).toBe('₺1,919,998.00');
    expect(content.total).toBe('₺1,919,998.00');
  });
});
