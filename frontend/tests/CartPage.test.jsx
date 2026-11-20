import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../src/App.jsx';
import CartPage, { CartView } from '../src/pages/CartPage.jsx';
import { buildCart, fakeCartItems } from '../src/pages/CartPage.fakeData.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { saveGuestItems } from '../src/utils/cartStorage.js';
import { authApi, cartApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

const routerFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

// The cart page with the real AuthProvider and CartProvider (SCRUM-71). The fake items are put
// in the guest cart in localStorage, so no backend is needed.
function renderCart() {
  saveGuestItems(fakeCartItems);
  return render(
    <MemoryRouter initialEntries={['/cart']} future={routerFlags}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

// One cart row, found by the product name.
const row = (name) => screen.getByRole('link', { name }).closest('li');
const summary = () => screen.getByRole('complementary', { name: 'Order summary' });

afterEach(() => vi.restoreAllMocks());

describe('buildCart', () => {
  it('counts units and adds up the subtotal (handbook 8.1 Cart)', () => {
    const cart = buildCart(fakeCartItems);
    expect(cart.itemCount).toBe(4); // 1 machine + 2 grinders + 1 thermos
    expect(cart.subtotal).toBe(99999 + 2 * 4199 + 1799);
  });

  it('rounds the subtotal to 2 decimals', () => {
    const item = (price) => ({ productId: price, quantity: 1, product: { price } });
    expect(buildCart([item(0.1), item(0.2)]).subtotal).toBe(0.3);
  });
});

describe('CartPage', () => {
  it('has a /cart route (an empty cart without a CartProvider)', () => {
    render(
      <MemoryRouter initialEntries={['/cart']} future={routerFlags}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('shows each item with model, unit price and line total, and the summary', async () => {
    renderCart();
    const grinder = (await screen.findByRole('link', { name: 'Zassenhaus Manaos Hand Grinder' })).closest('li');
    expect(within(grinder).getByText('Manaos')).toBeInTheDocument();
    expect(within(grinder).getByText('₺4,199.00 each')).toBeInTheDocument();
    expect(within(grinder).getByText('₺8,398.00')).toBeInTheDocument();
    // The photo has alt="" (the name is right next to it), so it is found by tag, not by role.
    expect(grinder.querySelector('img')).toHaveAttribute(
      'src',
      '/images/products/CRM-GR-8004/01.jpg'
    );
    expect(within(summary()).getByText('4')).toBeInTheDocument();
    expect(within(summary()).getByText('₺110,196.00')).toBeInTheDocument();
  });

  it('updates the line total and subtotal when the quantity changes, up to the stock', async () => {
    const user = userEvent.setup();
    renderCart();
    const machine = (await screen.findByRole('link', { name: 'Sage The Barista Express Impress' })).closest('li');
    const plus = within(machine).getByRole('button', { name: 'Increase quantity' });
    await user.click(plus);
    expect(within(machine).getByText('₺199,998.00')).toBeInTheDocument();
    expect(within(summary()).getByText('5')).toBeInTheDocument();

    for (let i = 0; i < 12; i += 1) await user.click(plus);
    expect(within(machine).getByLabelText('Quantity')).toHaveTextContent('9'); // stock is 9
  });

  it('removes an item with a toast, and shows the empty cart after the last one', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(await screen.findByRole('button', { name: 'Remove Bialetti Thermos 750 ml Grey' }));
    expect(screen.queryByRole('link', { name: 'Bialetti Thermos 750 ml Grey' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bialetti Thermos 750 ml Grey was removed');
    expect(within(summary()).getByText('3')).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /^Remove / })) await user.click(button);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('asks a guest to log in to check out', async () => {
    renderCart();
    expect(await screen.findByRole('link', { name: /log in to check out/i })).toHaveAttribute('href', '/checkout');
    expect(screen.getByText(/shopping as a guest/i)).toBeInTheDocument();
  });

  it('lets a logged-in customer go to checkout', async () => {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValueOnce({ user: { id: 1, name: 'Demo Customer', role: 'CUSTOMER' } });
    // Logged in, the guest cart is merged into the saved cart on the server.
    vi.spyOn(cartApi, 'merge').mockResolvedValueOnce({ cart: buildCart(fakeCartItems) });
    renderCart();
    expect(await screen.findByRole('link', { name: /go to checkout/i })).toHaveAttribute('href', '/checkout');
    expect(screen.queryByText(/shopping as a guest/i)).not.toBeInTheDocument();
  });
});

describe('CartView', () => {
  it('blocks checkout while a sold-out product is in the cart (req 7)', () => {
    const soldOut = { ...fakeCartItems[2], product: { ...fakeCartItems[2].product, quantityInStock: 0 } };
    render(
      <MemoryRouter future={routerFlags}>
        <ToastProvider>
          <CartView cart={buildCart([fakeCartItems[0], soldOut])} loggedIn onQuantityChange={() => {}} onRemove={() => {}} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /go to checkout/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Remove the sold-out items to continue.');
    expect(within(row('Bialetti Thermos 750 ml Grey')).getByText('Sold out')).toBeInTheDocument();
  });
});

// SCRUM-55: what the cart page does when the cart API says no, and while it loads.
describe('CartPage with the cart API (SCRUM-55)', () => {
  const customer = { id: 1, name: 'Demo Customer', role: 'CUSTOMER' };
  const apiError = (status, message) => Object.assign(new Error(message), { status });

  // A logged-in customer whose saved cart (GET /cart) holds the three sample items.
  function renderSavedCart(getCart = () => Promise.resolve({ cart: buildCart(fakeCartItems) })) {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: customer });
    vi.spyOn(cartApi, 'get').mockImplementation(getCart);
    return render(
      <MemoryRouter initialEntries={['/cart']} future={routerFlags}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/cart" element={<CartPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  it('shows "Loading your cart" until the saved cart arrives', async () => {
    let answer;
    renderSavedCart(() => new Promise((resolve) => { answer = resolve; }));
    expect(await screen.findByText('Loading your cart…')).toBeInTheDocument();
    answer({ cart: buildCart(fakeCartItems) });
    expect(await screen.findByRole('link', { name: 'Zassenhaus Manaos Hand Grinder' })).toBeInTheDocument();
  });

  it('keeps the old quantity and shows the reason when the API refuses a new one', async () => {
    // Someone else bought some in the meantime, so the server refuses 3 (handbook 7.3).
    const update = vi.spyOn(cartApi, 'updateItem').mockRejectedValueOnce(apiError(400, 'Only 2 in stock'));
    const user = userEvent.setup();
    renderSavedCart();
    const grinder = await screen.findByRole('link', { name: 'Zassenhaus Manaos Hand Grinder' }).then((link) => link.closest('li'));

    await user.click(within(grinder).getByRole('button', { name: 'Increase quantity' }));
    expect(update).toHaveBeenCalledWith(40, 3);
    expect(await screen.findByRole('status')).toHaveTextContent('Only 2 in stock');
    expect(within(grinder).getByLabelText('Quantity')).toHaveTextContent('2');
    expect(within(summary()).getByText('₺110,196.00')).toBeInTheDocument(); // subtotal unchanged
  });

  it('keeps the item and shows the reason when the API cannot remove it', async () => {
    vi.spyOn(cartApi, 'removeItem').mockRejectedValueOnce(apiError(0, 'Cannot reach the server. Is the backend running?'));
    const user = userEvent.setup();
    renderSavedCart();
    await user.click(await screen.findByRole('button', { name: 'Remove Bialetti Thermos 750 ml Grey' }));

    expect(await screen.findByText('Cannot reach the server. Is the backend running?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bialetti Thermos 750 ml Grey' })).toBeInTheDocument();
  });
});
