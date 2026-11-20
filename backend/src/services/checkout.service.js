// Sprint 2 (Luis, Neslihan, SCRUM-59): POST /checkout, the whole buying flow (handbook 7.4).
// One transaction through placeOrder (SCRUM-35): cart and stock check, then the fake bank,
// then the order, the payment row and the invoice. If any step fails nothing is saved.
// The invoice email goes out only after the commit, and a failed email keeps the order.
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import * as bankService from './bank.service.js';
import * as invoiceService from './invoice.service.js';
import { placeOrder } from './order.service.js';

// payments.card_hash: SHA-256 of CARD_HASH_SECRET + card number, 64 hex characters (handbook 7.4).
// The full number and the CVV are never saved anywhere.
export function cardHash(cardNumber) {
  return createHash('sha256').update(`${env.cardHashSecret}${cardNumber}`).digest('hex');
}

export const paymentRejected = () => new HttpError(402, 'Payment was rejected by the bank');

// userId comes from the login token. deliveryAddress and card come validated from checkoutSchema
// (card.number already has its spaces removed). Returns { order, invoice, emailSent }.
// Errors, in this order: empty cart 400, not enough stock 409, rejected by the bank 402.
export async function checkout(userId, { deliveryAddress, card }) {
  let invoice;

  const { order } = await placeOrder(
    userId,
    { deliveryAddress, cardLast4: card.number.slice(-4) },
    {
      // Runs after the stock check and before any write, so a rejected card changes nothing.
      pay: async ({ total }) => {
        const { approved, reference } = bankService.charge({ cardNumber: card.number, amount: total });
        if (!approved) throw paymentRejected();
        return { reference };
      },
      afterWrite: async ({ trx, orderId, total, paid }) => {
        await trx('payments').insert({
          order_id: orderId,
          card_hash: cardHash(card.number),
          card_last4: card.number.slice(-4),
          amount: total,
          status: 'APPROVED',
          bank_reference: paid.reference,
        });
        invoice = await invoiceService.createInvoice(trx, { orderId, total });
      },
    },
  );

  // After the commit (handbook 7.4 step 7). Never throws; false when the email failed.
  const emailSent = await invoiceService.sendInvoiceForOrder(order.id);
  return { order, invoice, emailSent };
}
