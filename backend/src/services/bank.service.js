// Sprint 2 (Ulukan): the fake bank of handbook 7.4. No real bank is called.
// The rules are written in docs/API.md "Fake bank rules":
// it approves every valid card number except those ending in 0002.
// Checkout uses it like this:
//   import * as bankService from '../services/bank.service.js';
//   const { approved, reference } = bankService.charge({ cardNumber, amount });
//   if (!approved) -> 402 "Payment was rejected by the bank"
import { randomBytes } from 'node:crypto';
import { cardDigits, isValidCardNumber } from '../utils/cardUtils.js';

// Returns { approved, reference }. reference is the bank's own id for an approved payment
// ("BNK-" and 16 characters, saved in payments.bank_reference); it is null when rejected.
// A real bank never takes a payment of zero or less, so that is rejected too.
export function charge({ cardNumber, amount }) {
  const digits = cardDigits(cardNumber);
  const approved = isValidCardNumber(digits) && !digits.endsWith('0002') && amount > 0;
  return {
    approved,
    reference: approved ? `BNK-${randomBytes(8).toString('hex').toUpperCase()}` : null,
  };
}
