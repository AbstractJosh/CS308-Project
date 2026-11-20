// Sprint 2 (Ulukan): the card fields of POST /checkout, as written in docs/API.md "Fake bank rules".
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { cardSchema } from '../../src/utils/validators.js';

// POST /checkout sends the card inside the body as `card`, so the fields are `card.number` etc.
const bodySchema = z.object({ card: cardSchema });

const validCard = {
  number: '4242 4242 4242 4242',
  holderName: 'Demo Customer',
  expiryMonth: 11,
  expiryYear: 2026,
  cvv: '123',
};

// Runs the real validate() middleware and returns what it found:
// details = the [{ field, message }] list of the 400 answer, card = the parsed card.
function check(body) {
  const req = { body };
  let error;
  validate(bodySchema)(req, {}, (err) => {
    error = err;
  });
  return { status: error?.status, details: error?.details ?? [], card: req.body.card };
}

// The valid card with some fields changed.
const checkCard = (changes) => check({ card: { ...validCard, ...changes } });

describe('cardSchema', () => {
  // "Expiry must be this month or later, by the server's date": the tests run on 11 November 2026.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('accepts a valid card', () => {
    expect(checkCard({}).details).toEqual([]);
  });

  it('removes the spaces from the number, trims the name and keeps a leading zero in the CVV', () => {
    const { card } = checkCard({ holderName: '  Demo Customer ', cvv: '012' });
    expect(card).toEqual({
      number: '4242424242424242',
      holderName: 'Demo Customer',
      expiryMonth: 11,
      expiryYear: 2026,
      cvv: '012',
    });
  });

  it('lets the rejected test card through: only the bank refuses it', () => {
    expect(checkCard({ number: '4000 0000 0000 0002' }).details).toEqual([]);
  });

  it.each([
    ['missing number', { number: undefined }, 'card.number', 'Card number is required'],
    ['empty number', { number: '' }, 'card.number', 'Card number is required'],
    ['number of spaces only', { number: '    ' }, 'card.number', 'Card number is required'],
    ['number that fails the Luhn check', { number: '4242 4242 4242 4241' }, 'card.number', 'Enter a valid card number'],
    ['number of 12 digits', { number: '424242424242' }, 'card.number', 'Enter a valid card number'],
    ['number of 20 digits', { number: '42424242424242424242' }, 'card.number', 'Enter a valid card number'],
    ['number with letters', { number: '4242 abcd 4242 4242' }, 'card.number', 'Enter a valid card number'],
    ['number that is not text', { number: 4242424242424242 }, 'card.number', 'Enter a valid card number'],
    ['missing name', { holderName: undefined }, 'card.holderName', 'Name on card is required'],
    ['name of spaces only', { holderName: '   ' }, 'card.holderName', 'Name on card is required'],
    ['name of 1 character', { holderName: 'A' }, 'card.holderName', 'Name on card must be 2 to 100 characters'],
    [
      'name of 101 characters',
      { holderName: 'a'.repeat(101) },
      'card.holderName',
      'Name on card must be 2 to 100 characters',
    ],
    ['missing month', { expiryMonth: undefined }, 'card.expiryMonth', 'Expiry month is required'],
    ['month 0', { expiryMonth: 0 }, 'card.expiryMonth', 'Enter a valid expiry month'],
    ['month 13', { expiryMonth: 13 }, 'card.expiryMonth', 'Enter a valid expiry month'],
    ['month that is not whole', { expiryMonth: 11.5 }, 'card.expiryMonth', 'Enter a valid expiry month'],
    ['month sent as text', { expiryMonth: '11' }, 'card.expiryMonth', 'Enter a valid expiry month'],
    ['missing year', { expiryYear: undefined }, 'card.expiryYear', 'Expiry year is required'],
    ['year of 2 digits', { expiryYear: 29 }, 'card.expiryYear', 'Enter a valid expiry year'],
    ['year of 5 digits', { expiryYear: 20290 }, 'card.expiryYear', 'Enter a valid expiry year'],
    ['year that is not whole', { expiryYear: 2029.5 }, 'card.expiryYear', 'Enter a valid expiry year'],
    ['year sent as text', { expiryYear: '2029' }, 'card.expiryYear', 'Enter a valid expiry year'],
    ['card that ended last month', { expiryMonth: 10 }, 'card.expiryMonth', 'This card has expired'],
    [
      'card that ended last year',
      { expiryMonth: 12, expiryYear: 2025 },
      'card.expiryMonth',
      'This card has expired',
    ],
    ['missing CVV', { cvv: undefined }, 'card.cvv', 'CVV is required'],
    ['empty CVV', { cvv: '' }, 'card.cvv', 'CVV is required'],
    ['CVV of 2 digits', { cvv: '12' }, 'card.cvv', 'CVV must be 3 or 4 digits'],
    ['CVV of 5 digits', { cvv: '12345' }, 'card.cvv', 'CVV must be 3 or 4 digits'],
    ['CVV with a letter', { cvv: '12a' }, 'card.cvv', 'CVV must be 3 or 4 digits'],
    ['CVV that is not text', { cvv: 123 }, 'card.cvv', 'CVV must be 3 or 4 digits'],
  ])('answers 400 to a %s, with one message for that field', (_label, changes, field, message) => {
    expect(checkCard(changes)).toMatchObject({ status: 400, details: [{ field, message }] });
    expect(checkCard(changes).details).toHaveLength(1);
  });

  it.each([
    ['card ending this month', { expiryMonth: 11, expiryYear: 2026 }],
    ['card ending next month', { expiryMonth: 12, expiryYear: 2026 }],
    ['card ending next January', { expiryMonth: 1, expiryYear: 2027 }],
    ['number of 13 digits', { number: '4222222222222' }],
    ['number of 19 digits', { number: '4242424242424242428' }],
    ['name of 2 characters', { holderName: 'Al' }],
    ['name of 100 characters', { holderName: 'a'.repeat(100) }],
    ['CVV of 4 digits', { cvv: '0123' }],
  ])('accepts a %s', (_label, changes) => {
    expect(checkCard(changes).details).toEqual([]);
  });

  it('lists every wrong field at once', () => {
    expect(checkCard({ number: '1234', cvv: '1' }).details).toEqual([
      { field: 'card.number', message: 'Enter a valid card number' },
      { field: 'card.cvv', message: 'CVV must be 3 or 4 digits' },
    ]);
  });

  it('does not also call the card expired when the month or the year itself is wrong', () => {
    expect(checkCard({ expiryMonth: 0 }).details).toEqual([
      { field: 'card.expiryMonth', message: 'Enter a valid expiry month' },
    ]);
    expect(checkCard({ expiryYear: 999 }).details).toEqual([
      { field: 'card.expiryYear', message: 'Enter a valid expiry year' },
    ]);
  });

  it('asks for the card when the body has none', () => {
    expect(check({}).details).toEqual([{ field: 'card', message: 'Card details are required' }]);
    expect(check({ card: '4242424242424242' }).details).toEqual([
      { field: 'card', message: 'Card details are required' },
    ]);
  });
});
