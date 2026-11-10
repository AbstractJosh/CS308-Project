import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../src/App.jsx';
import CartPage, { CartView } from '../src/pages/CartPage.jsx';
import { buildCart, fakeCartItems } from '../src/pages/CartPage.fakeData.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

const routerFlags = { v7_startTransition: true, v7_relativeSplatPath: true };

// The cart page with the real AuthProvider; no backend is needed.
function renderCart() {
  return render(
    <MemoryRouter initialEntries={['/cart']} future={routerFlags}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/cart" element={<CartPage />} />
          </Routes>
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
  it('has a /cart route', () => {
    render(
      <MemoryRouter initialEntries={['/cart']} future={routerFlags}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ready to brew?');
  });

  it('shows each item with model, unit price and line total, and the summary', () => {
    renderCart();
    const grinder = row('Zassenhaus Manaos Hand Grinder');
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
    const machine = row('Sage The Barista Express Impress');
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
    await user.click(screen.getByRole('button', { name: 'Remove Bialetti Thermos 750 ml Grey' }));
    expect(screen.queryByRole('link', { name: 'Bialetti Thermos 750 ml Grey' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bialetti Thermos 750 ml Grey was removed');
    expect(within(summary()).getByText('3')).toBeInTheDocument();

    for (const button of screen.getAllByRole('button', { name: /^Remove / })) await user.click(button);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('asks a guest to log in to check out', () => {
    renderCart();
    expect(screen.getByRole('link', { name: /log in to check out/i })).toHaveAttribute('href', '/checkout');
    expect(screen.getByText(/shopping as a guest/i)).toBeInTheDocument();
  });

  it('lets a logged-in customer go to checkout', async () => {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValueOnce({ user: { id: 1, name: 'Demo Customer', role: 'CUSTOMER' } });
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
