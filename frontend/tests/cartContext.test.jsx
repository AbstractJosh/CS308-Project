import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';
import { CartProvider, useCart } from '../src/context/CartContext.jsx';
import { authApi, cartApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';
import { addGuestItem, buildCart, saveGuestItems } from '../src/utils/cartStorage.js';

// SCRUM-71: CartContext with the real AuthProvider. Only the API calls are mocked.
const grinder = { id: 40, name: 'Zassenhaus Manaos Hand Grinder', model: 'Manaos', serialNumber: 'CRM-GR-8004', price: 4199, imageCount: 4, quantityInStock: 5 };
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' };
const serverCart = buildCart(addGuestItem([], grinder, 3));

// A small page that shows the cart and has buttons for every cart action.
function CartProbe() {
  const { cart, ready, addItem, updateQuantity, removeItem } = useCart();
  const { login, logout } = useAuth();
  return (
    <div>
      <p data-testid="state">{ready ? `${cart.itemCount} items, ${cart.subtotal}` : 'loading'}</p>
      <button onClick={() => addItem(grinder, 2)}>add</button>
      <button onClick={() => updateQuantity(40, 1)}>set one</button>
      <button onClick={() => removeItem(40)}>remove</button>
      <button onClick={() => login('customer@crema.com', 'Demo1234')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderCart() {
  return render(
    <AuthProvider>
      <CartProvider>
        <CartProbe />
      </CartProvider>
    </AuthProvider>
  );
}

const state = () => screen.getByTestId('state');

afterEach(() => vi.restoreAllMocks());

describe('CartContext', () => {
  it('keeps a guest cart in localStorage', async () => {
    const user = userEvent.setup();
    renderCart();
    expect(state()).toHaveTextContent('0 items');
    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(state()).toHaveTextContent('2 items, 8398');
    expect(JSON.parse(localStorage.getItem('crema_guest_cart'))[0].quantity).toBe(2);
    await user.click(screen.getByRole('button', { name: 'remove' }));
    expect(state()).toHaveTextContent('0 items');
  });

  it('loads the saved cart from the API for a logged-in user', async () => {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValueOnce({ user: customer });
    const get = vi.spyOn(cartApi, 'get').mockResolvedValueOnce({ cart: serverCart });
    renderCart();
    expect(await screen.findByText('3 items, 12597')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('merges the guest cart once at login and then clears it (req 4)', async () => {
    saveGuestItems(addGuestItem([], grinder, 2));
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: customer, token: 'new-token' });
    const merge = vi.spyOn(cartApi, 'merge').mockResolvedValueOnce({ cart: serverCart });
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('3 items, 12597')).toBeInTheDocument();
    expect(merge).toHaveBeenCalledWith([{ productId: 40, quantity: 2 }]);
    expect(localStorage.getItem('crema_guest_cart')).toBeNull();
  });

  it('uses the API for changes when logged in, and shows an empty guest cart after logout', async () => {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValueOnce({ user: customer });
    vi.spyOn(cartApi, 'get').mockResolvedValueOnce({ cart: serverCart });
    const update = vi.spyOn(cartApi, 'updateItem').mockResolvedValueOnce({ cart: buildCart(addGuestItem([], grinder, 1)) });
    const user = userEvent.setup();
    renderCart();
    await screen.findByText('3 items, 12597');

    await user.click(screen.getByRole('button', { name: 'set one' }));
    await waitFor(() => expect(state()).toHaveTextContent('1 items, 4199'));
    expect(update).toHaveBeenCalledWith(40, 1);

    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(state()).toHaveTextContent('0 items');
  });

  it('keeps the guest items when the merge fails, so nothing is lost', async () => {
    saveGuestItems(addGuestItem([], grinder, 2));
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: customer, token: 'new-token' });
    vi.spyOn(cartApi, 'merge').mockRejectedValueOnce(new Error('Cannot reach the server. Is the backend running?'));
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(state()).toHaveTextContent('0 items'));
    expect(JSON.parse(localStorage.getItem('crema_guest_cart'))[0].quantity).toBe(2);
  });
});
