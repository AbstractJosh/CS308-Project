import { describe, it, expect } from 'vitest';
import { formatPrice, stockLabel } from '../src/utils/format.js';
import { productImage } from '../src/utils/images.js';

describe('formatPrice', () => {
  it('formats lira with two decimals', () => {
    expect(formatPrice(12499)).toBe('₺12,499.00');
    expect(formatPrice('849.9')).toBe('₺849.90');
  });

  it('treats a missing value as zero', () => {
    expect(formatPrice(undefined)).toBe('₺0.00');
  });
});

describe('stockLabel', () => {
  it('follows the stock rules', () => {
    expect(stockLabel(0)).toEqual({ text: 'Sold out', tone: 'out' });
    expect(stockLabel(3)).toEqual({ text: 'Only 3 left', tone: 'low' });
    expect(stockLabel(40)).toEqual({ text: '40 in stock', tone: 'ok' });
  });
});

describe('productImage', () => {
  const product = { serialNumber: 'CRM-EM-1001', imageCount: 4 };

  it('returns photo 1 by default', () => {
    expect(productImage(product)).toBe('/images/products/CRM-EM-1001/01.jpg');
  });

  it('pads the photo number to two digits', () => {
    expect(productImage(product, 3)).toBe('/images/products/CRM-EM-1001/03.jpg');
  });
});
