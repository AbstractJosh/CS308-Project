// FAKE DATA for the checkout page (SCRUM-53). Owner: Sezin.
// POST /checkout is not on develop yet (checkout API: Luis and Neslihan, Sprint 2 days 8 to 11).
// fakeCheckout() takes the same body and answers like the API in handbook 8.3 and docs/API.md,
// including the fake bank rule. SCRUM-54 replaces it with the real call; delete this file then.

const FAKE_DELAY_MS = 400;

// cart is the cart from useCart(); the real API reads it from the database instead.
export async function fakeCheckout(body, cart) {
  await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));

  // Fake bank (docs/API.md): every valid number is approved except those ending in 0002.
  if (body.card.number.endsWith('0002')) {
    throw Object.assign(new Error('Payment was rejected by the bank'), { status: 402 });
  }

  const orderId = 1001;
  return {
    order: {
      id: orderId,
      status: 'PROCESSING',
      total: cart.subtotal,
      deliveryAddress: body.deliveryAddress,
      cardLast4: body.card.number.slice(-4), // never the full number or the CVV
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      items: cart.items.map((item, i) => ({
        id: i + 1,
        productId: item.productId,
        name: item.product.name,
        model: item.product.model,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
    },
    invoice: { id: orderId, invoiceNumber: `INV-${String(orderId).padStart(6, '0')}` },
    emailSent: true,
  };
}
