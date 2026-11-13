import { describe, it, expect } from 'vitest';
import {
  checkoutBody,
  checkoutServerErrors,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
  passesLuhn,
  validateAddress,
  validateCard,
} from '../src/utils/checkoutForm.js';

// A fixed "today" (10 November 2026), so the expiry tests do not depend on the real date.
const today = new Date(2026, 10, 10);
const goodCard = { holderName: 'Demo Customer', number: '4242 4242 4242 4242', expiry: '11/29', cvv: '123' };
const errorsFor = (changes) => validateCard({ ...goodCard, ...changes }, today);

describe('formatting while typing', () => {
  it('groups the card number in fours and keeps only digits', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-42ab42')).toBe('4242 4242');
    expect(formatCardNumber('1'.repeat(25)).replace(/ /g, '')).toHaveLength(19);
  });

  it('puts a slash in the expiry date', () => {
    expect(formatExpiry('1129')).toBe('11/29');
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('11/2')).toBe('11/2');
  });
});

describe('passesLuhn and parseExpiry', () => {
  it('knows the test cards from docs/API.md', () => {
    expect(passesLuhn('4242424242424242')).toBe(true);
    expect(passesLuhn('4000000000000002')).toBe(true); // valid number, the bank rejects it
    expect(passesLuhn('4242424242424241')).toBe(false);
  });

  it('reads MM/YY as a month and a 4-digit year', () => {
    expect(parseExpiry('11/29')).toEqual({ month: 11, year: 2029 });
    expect(parseExpiry('13/29')).toBeNull();
    expect(parseExpiry('1129')).toBeNull();
  });
});

describe('validateCard (docs/API.md messages)', () => {
  it('accepts a good card', () => {
    expect(validateCard(goodCard, today)).toEqual({});
  });

  it('checks the number', () => {
    expect(errorsFor({ number: '' }).number).toBe('Card number is required');
    expect(errorsFor({ number: '4242 4242 4242 4241' }).number).toBe('Enter a valid card number');
    expect(errorsFor({ number: '4242' }).number).toBe('Enter a valid card number');
  });

  it('checks the name and the CVV', () => {
    expect(errorsFor({ holderName: ' ' }).holderName).toBe('Name on card is required');
    expect(errorsFor({ holderName: 'A' }).holderName).toBe('Name on card must be 2 to 100 characters');
    expect(errorsFor({ cvv: '12' }).cvv).toBe('CVV must be 3 or 4 digits');
    expect(errorsFor({ cvv: '0123' }).cvv).toBeUndefined();
  });

  it('accepts a card until the end of its month and refuses an older one', () => {
    expect(errorsFor({ expiry: '11/26' }).expiry).toBeUndefined();
    expect(errorsFor({ expiry: '10/26' }).expiry).toBe('This card has expired');
    expect(errorsFor({ expiry: '1/30' }).expiry).toBe('Enter the expiry date as MM/YY');
  });
});

describe('validateAddress', () => {
  it('needs 10 to 300 characters', () => {
    expect(validateAddress('  ')).toEqual({ deliveryAddress: 'Delivery address is required' });
    expect(validateAddress('Tuzla')).toEqual({ deliveryAddress: 'Delivery address must be 10 to 300 characters' });
    expect(validateAddress('Sabancı University, Tuzla, İstanbul')).toEqual({});
  });
});

describe('checkoutBody', () => {
  it('builds the POST /checkout body of handbook 8.3', () => {
    expect(checkoutBody('  Sabancı University, Tuzla  ', { ...goodCard, cvv: '012' })).toEqual({
      deliveryAddress: 'Sabancı University, Tuzla',
      card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 11, expiryYear: 2029, cvv: '012' },
    });
  });
});

describe('checkoutServerErrors', () => {
  it('puts API field errors on the form fields and other errors above the button', () => {
    const invalid = { status: 400, message: 'This card has expired', details: [{ field: 'card.expiryMonth', message: 'This card has expired' }] };
    expect(checkoutServerErrors(invalid)).toEqual({ fields: { expiry: 'This card has expired' }, form: '' });
    const rejected = { status: 402, message: 'Payment was rejected by the bank' };
    expect(checkoutServerErrors(rejected)).toEqual({
      fields: {},
      form: 'Payment was rejected by the bank. You can try another card.',
    });
    const down = { status: 0, message: 'Cannot reach the server. Is the backend running?' };
    expect(checkoutServerErrors(down).form).toBe('Cannot reach the server. Is the backend running?');
  });
});

describe('formatExpiry with a 4-digit year (SCRUM-111)', () => {
  it('turns pasted or autofilled dates into MM/YY', () => {
    expect(formatExpiry('11/2029')).toBe('11/29');
    expect(formatExpiry('1/2029')).toBe('01/29');
    expect(formatExpiry('11-2029')).toBe('11/29');
    expect(formatExpiry('2029-11')).toBe('11/29');
    expect(formatExpiry('112029')).toBe('11/29');
  });

  it('still works while typing MM/YY by hand', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('112')).toBe('11/2');
    expect(formatExpiry('11/29')).toBe('11/29');
    expect(formatExpiry('11/295')).toBe('11/29');
  });
});
