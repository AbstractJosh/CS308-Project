// SCRUM-77 (Murat): the small helpers of the product manager catalog service. No database.
import { describe, it, expect } from 'vitest';
import { slugify, toAdminProduct, toProductRow } from '../../src/services/adminCatalog.service.js';

describe('slugify', () => {
  it('makes a URL name from a category name', () => {
    expect(slugify('Milk Frothers')).toBe('milk-frothers');
    expect(slugify('French Press & Moka Pot')).toBe('french-press-moka-pot');
  });

  it('turns Turkish letters into plain ones', () => {
    expect(slugify('Türk Kahvesi Fincanları')).toBe('turk-kahvesi-fincanlari');
    expect(slugify('Çay & Şeker')).toBe('cay-seker');
  });

  it('gives an empty slug when the name has no letters or digits', () => {
    expect(slugify('&&& !!')).toBe('');
  });

  it('keeps slugs at most 80 characters, never ending in a dash', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('toProductRow', () => {
  it('turns body fields into column names and leaves out fields that were not sent', () => {
    expect(toProductRow({ serialNumber: 'CRM-SV-9006', quantityInStock: 4, cost: null })).toEqual({
      serial_number: 'CRM-SV-9006',
      quantity_in_stock: 4,
      cost: null,
    });
  });

  it('ignores fields that are not product columns', () => {
    expect(toProductRow({ name: 'A', isActive: false, popularity: 99 })).toEqual({ name: 'A' });
  });
});

describe('toAdminProduct', () => {
  const row = {
    id: 5,
    name: 'Sage The Bambino Plus',
    model: 'SES500 BSS',
    serialNumber: 'CRM-EM-1005',
    description: 'Compact espresso machine.',
    quantityInStock: 12,
    price: '49999.00',
    cost: '25000.50',
    warrantyStatus: '2 years manufacturer warranty',
    distributor: 'Sage official distributor',
    imageCount: 8,
    popularity: 152,
    categoryId: 1,
    categoryName: 'Espresso Machines',
    categorySlug: 'espresso-machines',
  };

  it('is the public product plus cost as a number', () => {
    const product = toAdminProduct(row);
    expect(product.price).toBe(49999);
    expect(product.cost).toBe(25000.5);
    expect(product.category).toEqual({ id: 1, name: 'Espresso Machines', slug: 'espresso-machines' });
  });

  it('keeps a missing cost as null, not 0', () => {
    expect(toAdminProduct({ ...row, cost: null }).cost).toBeNull();
  });
});
