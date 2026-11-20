import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartPage from '../src/pages/CartPage.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, cartApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';
import { buildCart } from '../src/utils/cartStorage.js';

// SCRUM-113 (bug): the cart said "<name> was removed from your cart" as soon as Remove was
// pressed, before the server answered, so a slow or failed removal showed a wrong message.
// A logged-in customer is used, because their removal goes to the server (DELETE /cart/items/:id).
const thermos = {
  id: 45,
  name: 'Bialetti Thermos 750 ml Grey',
  model: 'Thermos 750 ml',
  serialNumber: 'CRM-SV-9005',
  price: 1799,
  imageCount: 1,
  quantityInStock: 22,
};
const savedCart = buildCart([{ productId: 45, quantity: 1, product: thermos }]);
const REMOVED = 'Bialetti Thermos 750 ml Grey was removed from your cart';

function renderSavedCart() {
  tokenStore.set('saved-token');
  vi.spyOn(authApi, 'me').mockResolvedValue({ user: { id: 1, name: 'Demo Customer', role: 'CUSTOMER' } });
  vi.spyOn(cartApi, 'get').mockResolvedValue({ cart: savedCart });
  return render(
    <MemoryRouter initialEntries={['/cart']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

const removeButton = () => screen.findByRole('button', { name: 'Remove Bialetti Thermos 750 ml Grey' });

afterEach(() => vi.restoreAllMocks());

describe('removing an item from the cart (SCRUM-113)', () => {
  it('says nothing about "removed" while the server has not answered yet', async () => {
    let answer;
    vi.spyOn(cartApi, 'removeItem').mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const user = userEvent.setup();
    renderSavedCart();
    await user.click(await removeButton());

    expect(screen.queryByText(REMOVED)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: thermos.name })).toBeInTheDocument();

    // The server confirms: now the item is gone and the message is true.
    answer({ cart: buildCart([]) });
    expect(await screen.findByText(REMOVED)).toBeInTheDocument();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('never says "removed" when the removal fails, only the reason', async () => {
    vi.spyOn(cartApi, 'removeItem').mockRejectedValueOnce(
      Object.assign(new Error('Cannot reach the server. Is the backend running?'), { status: 0 })
    );
    const user = userEvent.setup();
    renderSavedCart();
    await user.click(await removeButton());

    expect(await screen.findByText('Cannot reach the server. Is the backend running?')).toBeInTheDocument();
    expect(screen.queryByText(REMOVED)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: thermos.name })).toBeInTheDocument();
  });

  it('still says "removed" for a guest, whose cart is in the browser and changes at once', async () => {
    localStorage.setItem('crema_guest_cart', JSON.stringify(savedCart.items));
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/cart']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    await user.click(await removeButton());
    await waitFor(() => expect(screen.getByText(REMOVED)).toBeInTheDocument());
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });
});
