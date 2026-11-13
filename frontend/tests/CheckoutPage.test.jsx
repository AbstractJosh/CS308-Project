import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CheckoutPage from '../src/pages/CheckoutPage.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, cartApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';
import { addGuestItem, buildCart } from '../src/utils/cartStorage.js';
import { fakeCheckout } from '../src/pages/CheckoutPage.fakeData.js';

// The fake payment is replaced by a mock, so a test decides what the "bank" answers
// and can check the exact body the page sends.
vi.mock('../src/pages/CheckoutPage.fakeData.js', () => ({ fakeCheckout: vi.fn() }));

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

afterEach(() => {
  vi.restoreAllMocks();
  fakeCheckout.mockReset();
});

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
    expect(fakeCheckout).not.toHaveBeenCalled();
  });

  it('sends the handbook 8.3 body and shows the placed order', async () => {
    fakeCheckout.mockResolvedValueOnce({
      order: { id: 1001, total: 108397, cardLast4: '4242' },
      invoice: { id: 1001, invoiceNumber: 'INV-001001' },
      emailSent: true,
    });
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    expect(screen.getByText(HOME)).toBeInTheDocument();
    await fillCard(user);
    await user.click(payButton());

    expect(await screen.findByText('Thank you, your order is placed')).toBeInTheDocument();
    expect(screen.getByText(/card ending 4242/)).toBeInTheDocument();
    expect(fakeCheckout).toHaveBeenCalledWith(
      {
        deliveryAddress: HOME,
        card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 11, expiryYear: 2029, cvv: '123' },
      },
      fullCart
    );
  });

  it('keeps the user on the payment step when the bank rejects the card', async () => {
    fakeCheckout.mockRejectedValueOnce(Object.assign(new Error('Payment was rejected by the bank'), { status: 402 }));
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
    fakeCheckout.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());

    expect(screen.getByRole('button', { name: /paying/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
    expect(screen.getByLabelText('Card number')).toBeDisabled();

    answer({ order: { id: 1001, total: 108397, cardLast4: '4242' }, invoice: { id: 1001, invoiceNumber: 'INV-001001' }, emailSent: true });
    expect(await screen.findByText('Thank you, your order is placed')).toBeInTheDocument();
  });

  it('SCRUM-108: empties the cart after a successful payment', async () => {
    fakeCheckout.mockResolvedValueOnce({
      order: { id: 1001, total: 108397, cardLast4: '4242' },
      invoice: { id: 1001, invoiceNumber: 'INV-001001' },
      emailSent: true,
    });
    const remove = vi.spyOn(cartApi, 'removeItem').mockResolvedValue({ cart: buildCart([]) });
    const user = userEvent.setup();
    renderCheckout();
    await goToPayment(user);
    await fillCard(user);
    await user.click(payButton());

    expect(await screen.findByText('Thank you, your order is placed')).toBeInTheDocument();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    expect(remove).toHaveBeenCalledWith(3);
    expect(remove).toHaveBeenCalledWith(40);
  });

  it('SCRUM-109: goes back to the address step and shows it when the server rejects the address', async () => {
    const details = [{ field: 'deliveryAddress', message: 'Delivery address must be 10 to 300 characters' }];
    fakeCheckout.mockRejectedValueOnce(Object.assign(new Error(details[0].message), { status: 400, details }));
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
    fakeCheckout.mockRejectedValueOnce(Object.assign(new Error('Payment was rejected by the bank'), { status: 402 }));
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
