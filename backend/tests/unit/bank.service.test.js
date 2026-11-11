// Sprint 2 (Ulukan): the fake bank of handbook 7.4 and docs/API.md "Fake bank rules".
import { describe, it, expect } from 'vitest';
import * as bankService from '../../src/services/bank.service.js';

describe('bankService.charge', () => {
  it('approves the approved test card and gives a bank reference', () => {
    const result = bankService.charge({ cardNumber: '4242424242424242', amount: 1299.9 });
    expect(result).toEqual({ approved: true, reference: expect.stringMatching(/^BNK-[0-9A-F]{16}$/) });
  });

  it.each([
    ['the rejected test card', '4000000000000002'],
    ['any other valid card ending in 0002', '5555555500040002'],
  ])('rejects %s, with no reference', (_label, cardNumber) => {
    expect(bankService.charge({ cardNumber, amount: 50 })).toEqual({ approved: false, reference: null });
  });

  it('rejects a number that fails the Luhn check', () => {
    expect(bankService.charge({ cardNumber: '4242424242424241', amount: 50 })).toEqual({
      approved: false,
      reference: null,
    });
  });

  it('reads the number with spaces the same way, as it is written in docs/API.md', () => {
    expect(bankService.charge({ cardNumber: '4242 4242 4242 4242', amount: 50 }).approved).toBe(true);
    expect(bankService.charge({ cardNumber: '4000 0000 0000 0002', amount: 50 }).approved).toBe(false);
  });

  it('gives each approved payment its own reference, short enough for payments.bank_reference', () => {
    const first = bankService.charge({ cardNumber: '4242424242424242', amount: 50 });
    const second = bankService.charge({ cardNumber: '4242424242424242', amount: 50 });
    expect(first.reference).not.toBe(second.reference);
    expect(first.reference.length).toBeLessThanOrEqual(40);
  });

  it.each([
    ['zero', 0],
    ['a negative amount', -50],
    ['an amount that is not a number', NaN],
    ['a missing amount', undefined],
  ])('never approves %s', (_label, amount) => {
    expect(bankService.charge({ cardNumber: '4242424242424242', amount })).toEqual({
      approved: false,
      reference: null,
    });
  });
});
