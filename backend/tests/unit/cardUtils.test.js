// Sprint 2 (Ulukan): the card checks of docs/API.md "Fake bank rules", without a database.
import { describe, it, expect } from 'vitest';
import { cardDigits, isCardExpired, isValidCardNumber } from '../../src/utils/cardUtils.js';

describe('cardDigits', () => {
  it('removes the spaces a form puts between the groups', () => {
    expect(cardDigits('4242 4242 4242 4242')).toBe('4242424242424242');
    expect(cardDigits(' 4242424242424242 ')).toBe('4242424242424242');
  });

  it('leaves everything else alone, so a dash still fails the number check', () => {
    expect(cardDigits('4242-4242-4242-4242')).toBe('4242-4242-4242-4242');
  });
});

describe('isValidCardNumber', () => {
  it.each([
    ['the approved test card', '4242424242424242'],
    ['the rejected test card (the bank refuses it, the number itself is fine)', '4000000000000002'],
    ['13 digits', '4222222222222'],
    ['15 digits', '378282246310005'],
    ['19 digits', '4242424242424242428'],
  ])('accepts %s', (_label, number) => {
    expect(isValidCardNumber(number)).toBe(true);
  });

  it.each([
    ['the test card that fails the Luhn check', '4242424242424241'],
    ['12 digits that pass the Luhn check', '424242424242'],
    ['20 digits that pass the Luhn check', '42424242424242424242'],
    ['letters', '4242abcd42424242'],
    ['spaces that were not removed', '4242 4242 4242 4242'],
    ['an empty string', ''],
  ])('refuses %s', (_label, number) => {
    expect(isValidCardNumber(number)).toBe(false);
  });
});

describe('isCardExpired', () => {
  const november11 = new Date(2026, 10, 11);

  it('lets a card ending this month through', () => {
    expect(isCardExpired(11, 2026, november11)).toBe(false);
  });

  it('lets a card ending 11/2026 through until the last second of November 2026', () => {
    expect(isCardExpired(11, 2026, new Date(2026, 10, 30, 23, 59, 59))).toBe(false);
    expect(isCardExpired(11, 2026, new Date(2026, 11, 1, 0, 0, 0))).toBe(true);
  });

  it('refuses a card that ended last month', () => {
    expect(isCardExpired(10, 2026, november11)).toBe(true);
  });

  it('refuses a card from last year, even with a later month', () => {
    expect(isCardExpired(12, 2025, november11)).toBe(true);
  });

  it('lets a card from next year through, even with an earlier month', () => {
    expect(isCardExpired(1, 2027, november11)).toBe(false);
  });

  it("uses the server's date when no date is given", () => {
    expect(isCardExpired(1, 2000)).toBe(true);
    expect(isCardExpired(12, 9999)).toBe(false);
  });
});
