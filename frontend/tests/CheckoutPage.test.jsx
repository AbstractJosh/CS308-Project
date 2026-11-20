import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CheckoutPage from '../src/pages/CheckoutPage.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, cartApi, checkoutApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';
import { addGuestItem, buildCart } from '../src/utils/cartStorage.js';

// POST /checkout is mocked (checkoutApi.create), so a test decides what the server answers
// and can check the exact body the page sends. No backend or database is needed.
let create;
beforeEach(() => {
  create = vi.spyOn(checkoutApi, 'create');
  // After paying, the page brings the cart up to date; the server's cart is empty then.
  vi.spyOn(cartApi, 'removeItem').mockResolvedValue({ cart: buildCart([]) });
});

const HOME = 'Sabancı University, Orta Mahalle, Tuzla, İstanbul';
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER', homeAddress: HOME };
const machine = { id: 3, name: 'Sage The Barista Express Impress', model: 'SES876 BSS', serialNumber: 'CRM-EM-1003', price: 99999, imageCount: 8, quantityInStock: 9 };
const grinder = { id: 40, name: 'Zassenhaus Manaos Hand Grinder', model: 'Manaos', serialNumber: 'CRM-GR-8004', price: 4199, imageCount: 4, quantityInStock: 14 };
const fullCart = buildCart(addGuestItem(addGuestItem([], machine, 1), grinder, 2));

// A logged-in customer (the token is checked with GET /auth/me) whose cart comes from GET /cart.
function renderCheckout(cart = fullCart) {
  tokenStore.set('saved-token');
  vi.spyOn(authApi, 'me').mockResolvedValue({ user: customer });
  vi.spyOn(cartApi, 'get').mockResolvedValue({ cart });
  return render(
    <MemoryRouter initialEntries={['/checkout']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const continueButton = () => screen.getByRole('button', { name: 'Continue to payment' });
const payButton = () => screen.getByRole('button', { name: /^pay /i });

async function goToPayment(user) {
  await user.click(await screen.findByRole('button', { name: 'Continue to payment' }));
}

async function fillCard(user, { number = '4242 4242 4242 4242', expiry = '1129', cvv = '123' } = {}) {
  await user.type(screen.getByLabelText('Name on card'), 'Demo Customer');
  await user.type(screen.getByLabelText('Card number'), number);
  await user.type(screen.getByLabelText('Expiry (MM/YY)'), expiry);
  await user.type(screen.getByLabelText('CVV'), cvv);
}

afterEach(() => vi.restoreAllMocks());

// A 201 answer of POST /checkout (docs/API.md), for the cart above.
function placedAnswer({ emailSent = true } = {}) {
  return {
    order: {
      id: 1001,
      status: 'PROCESSING',
      total: 108397,
      deliveryAddress: HOME,
      cardLast4: '4242',
      createdAt: '2026-11-19T10:00:00.000Z',
      deliveredAt: null,
      items: [
        { id: 1, productId: 3, name: machine.name, model: machine.model, quantity: 1, unitPrice: 99999 },
        { id: 2, productId: 40, name: grinder.name, model: grinder.model, quantity: 2, unitPrice: 4199 },
      ],
    },
    invoice: { id: 7, invoiceNumber: 'INV-001001' },
    emailSent,
  };
}

const placedHeading = () => screen.findByRole('heading', { name: /thank you, your order is placed/i });

describe('CheckoutPage', () => {
  it('starts with the home address filled in and shows the order summary', async () => {
    renderCheckout();
    expect(await screen.findByLabelText('Deliver to')).toHaveValue(HOME);
    const summary = screen.getByRole('complementary', { name: 'Order summary' });
    expect(within(summary).getByText('Zassenhaus Manaos Hand Grinder')).toBeInTheDocument();
    expect(within(summary).getByText('₺108,397.00')).toBeInTheDocument(); // 99,999 + 2 × 4,199
    const steps = screen.getByRole('list', { name: 'Checkout steps' });
    expect(within(steps).getByText('Delivery address').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('needs a 10 to 300 character address before the payment step', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.clear(await screen.findByLabelText('Deliver to'));
    await user.type(screen.getByLabelText('Deliver to'), 'Tuzla');
    await user.click(continueButton());
    expect(screen.getByText('Delivery address must be 10 to 300 characters')).toBeInTheDocument();
    expect(screen.queryByLabelText('Card number')).not.toBeInTheDocument();
  });

  it('formats the card while typing and shows the card mistakes without paying', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user, { number: '4242424242424241', expiry: '1320', cvv: '12' });
    expect(screen.getByLabelText('Card number')).toHaveValue('4242 4242 4242 4241');
    expect(screen.getByLabelText('Expiry (MM/YY)')).toHaveValue('13/20');

    await user.click(payButton());
    expect(screen.getByText('Enter a valid card number')).toBeInTheDocument();
    expect(screen.getByText('Enter the expiry date as MM/YY')).toBeInTheDocument();
    expect(screen.getByText('CVV must be 3 or 4 digits')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('sends the handbook 8.3 body and shows the placed order', async () => {
    create.mockResolvedValueOnce(placedAnswer());
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    expect(screen.getByText(HOME)).toBeInTheDocument();
    await fillCard(user);
    await user.click(payButton());

    expect(await placedHeading()).toBeInTheDocument();
    expect(screen.getByText('Card ending 4242')).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(
      {
        deliveryAddress: HOME,
        card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 11, expiryYear: 2029, cvv: '123' },
      }
    );
  });

  it('keeps the user on the payment step when the bank rejects the card', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('Payment was rejected by the bank'), { status: 402 }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user, { number: '4000 0000 0000 0002' });
    await user.click(payButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Payment was rejected by the bank. You can try another card.');
    expect(screen.getByLabelText('CVV')).toHaveValue(''); // typed again for the next try
    expect(screen.getByLabelText('Card number')).toHaveValue('4000 0000 0000 0002');
    expect(payButton()).toBeEnabled();
  });

  it('lets the user go back and change the address', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Deliver to')).toHaveValue(HOME);
  });

  it('shows an empty cart message instead of the form', async () => {
    renderCheckout(buildCart([]));
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('does not let a sold-out product be bought (req 7)', async () => {
    // Built by hand: addGuestItem rightly refuses a sold-out product, but a product can sell
    // out while it already waits in a cart.
    renderCheckout(buildCart([{ productId: 40, quantity: 1, product: { ...grinder, quantityInStock: 0 } }]));
    expect(await screen.findByText('Some items are sold out')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to cart' })).toHaveAttribute('href', '/cart');
  });
});

// Bugs found by Ulukan while reviewing PR #36 (Jira SCRUM-107 to SCRUM-111).
describe('checkout bugs from the PR #36 review', () => {
  it('SCRUM-107: locks "Change" and the card fields while the payment is sending', async () => {
    let answer;
    create.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());

    expect(screen.getByRole('button', { name: /processing payment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
    expect(screen.getByLabelText('Card number')).toBeDisabled();

    answer(placedAnswer());
    expect(await placedHeading()).toBeInTheDocument();
  });

  it('SCRUM-108: empties the cart after a successful payment', async () => {
    create.mockResolvedValueOnce(placedAnswer());
    const remove = cartApi.removeItem;
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());

    expect(await placedHeading()).toBeInTheDocument();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    expect(remove).toHaveBeenCalledWith(3);
    expect(remove).toHaveBeenCalledWith(40);
  });

  it('SCRUM-109: goes back to the address step and shows it when the server rejects the address', async () => {
    const details = [{ field: 'deliveryAddress', message: 'Delivery address must be 10 to 300 characters' }];
    create.mockRejectedValueOnce(Object.assign(new Error(details[0].message), { status: 400, details }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());

    expect(await screen.findByText('Delivery address must be 10 to 300 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Deliver to')).toHaveAttribute('aria-invalid', 'true');
    // The message goes away once the address is edited.
    await user.type(screen.getByLabelText('Deliver to'), ', Turkey');
    expect(screen.queryByText('Delivery address must be 10 to 300 characters')).not.toBeInTheDocument();
  });

  it('SCRUM-110: after a rejected card, does not shout "CVV is required" and keeps the bank message while typing', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('Payment was rejected by the bank'), { status: 402 }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user, { number: '4000 0000 0000 0002' });
    await user.click(payButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Payment was rejected by the bank');
    expect(screen.queryByText('CVV is required')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('CVV'), '1');
    expect(screen.getByRole('alert')).toHaveTextContent('Payment was rejected by the bank');
  });

  it('SCRUM-111: reads a pasted MM/YYYY expiry as MM/YY', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await user.click(screen.getByLabelText('Expiry (MM/YY)'));
    await user.paste('11/2029');
    expect(screen.getByLabelText('Expiry (MM/YY)')).toHaveValue('11/29');
  });
});

// SCRUM-54: checkout on the real POST /checkout, with processing, rejected and confirmation states.
describe('checkout on the real API (SCRUM-54)', () => {
  async function payWith(user, cardOptions) {
    renderCheckout();
    await goToPayment(user);
    await fillCard(user, cardOptions);
    await user.click(payButton());
  }

  it('shows a processing state while the server answers', async () => {
    create.mockReturnValueOnce(new Promise(() => {})); // never answers in this test
    const user = userEvent.setup();
    await payWith(user);
    expect(screen.getByRole('button', { name: /processing payment/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Your payment is being processed');
  });

  it('shows the confirmation: order, status, items, total, address, card and invoice', async () => {
    create.mockResolvedValueOnce(placedAnswer());
    const scroll = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    await payWith(user);

    expect(await placedHeading()).toBeInTheDocument();
    expect(scroll).toHaveBeenCalledWith(0, 0); // opens at the top, not at the old Pay button
    expect(screen.getByText(/Order #1001/)).toBeInTheDocument();
    expect(screen.getByText('Processing')).toHaveClass('status-pill');
    const items = screen.getByRole('list', { name: 'Items you bought' });
    expect(within(items).getByText(grinder.name)).toBeInTheDocument();
    expect(within(items).getByText('₺8,398.00')).toBeInTheDocument(); // 2 × 4,199 paid
    expect(screen.getByText('₺108,397.00')).toBeInTheDocument();
    expect(screen.getByText(HOME)).toBeInTheDocument();
    expect(screen.getByText('INV-001001')).toBeInTheDocument();
    expect(screen.getByText(/We emailed the invoice to customer@crema.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View order' })).toHaveAttribute('href', '/orders/1001');
  });

  it('still confirms the order when the invoice email failed (emailSent: false)', async () => {
    create.mockResolvedValueOnce(placedAnswer({ emailSent: false }));
    const user = userEvent.setup();
    await payWith(user);
    expect(await placedHeading()).toBeInTheDocument();
    expect(screen.getByText(/could not email the invoice/)).toBeInTheDocument();
  });

  it('downloads the invoice PDF with the login token', async () => {
    create.mockResolvedValueOnce(placedAnswer());
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'])) });
    vi.stubGlobal('fetch', fetchMock);
    // jsdom has no real files, so the parts that hand the file to the browser are stubbed.
    URL.createObjectURL = vi.fn(() => 'blob:invoice');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    await payWith(user);

    await user.click(await screen.findByRole('button', { name: 'Download invoice (PDF)' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/invoices/7/pdf', {
      headers: { Authorization: 'Bearer saved-token' },
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0].download).toBe('INV-001001.pdf');
    vi.unstubAllGlobals();
  });

  it('shows the error when the invoice cannot be downloaded', async () => {
    create.mockResolvedValueOnce(placedAnswer());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ error: 'Forbidden' }) }));
    const user = userEvent.setup();
    await payWith(user);
    await user.click(await screen.findByRole('button', { name: 'Download invoice (PDF)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    vi.unstubAllGlobals();
  });

  it('shows the rejected state with a title when the bank says no', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('Payment was rejected by the bank'), { status: 402 }));
    const user = userEvent.setup();
    await payWith(user, { number: '4000 0000 0000 0002' });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Payment rejected');
    expect(alert).toHaveTextContent('You can try another card.');
  });

  it('says which product ran out when the server answers 409, with a way back to the cart', async () => {
    const details = [{ field: 'productId', message: 'Zassenhaus Manaos Hand Grinder has only 1 left' }];
    create.mockRejectedValueOnce(Object.assign(new Error(details[0].message), { status: 409, details }));
    const user = userEvent.setup();
    await payWith(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Not enough stock');
    expect(alert).toHaveTextContent('Zassenhaus Manaos Hand Grinder has only 1 left.');
    expect(within(alert).getByRole('link', { name: 'Back to cart' })).toHaveAttribute('href', '/cart');
  });
});

// SCRUM-55: more checkout cases that were not tested yet.
describe('checkout edge cases (SCRUM-55)', () => {
  it('sends only one order when Pay is double-clicked', async () => {
    create.mockReturnValue(new Promise(() => {})); // the server is still thinking
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.dblClick(payButton());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('shows "Your order was not placed" with the server message for other errors', async () => {
    // A staff account may not check out (docs/API.md: 403 for staff).
    create.mockRejectedValueOnce(Object.assign(new Error('Only customers can check out'), { status: 403 }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your order was not placed');
    expect(alert).toHaveTextContent('Only customers can check out');
    expect(within(alert).queryByRole('link', { name: 'Back to cart' })).not.toBeInTheDocument();
  });
});
