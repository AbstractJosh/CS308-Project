import { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, cartApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';
import { addGuestItem, buildCart, saveGuestItems } from '../src/utils/cartStorage.js';

// SCRUM-42 and SCRUM-46 (handbook 7.3): checkout needs login. The real routes, pages and
// providers run, in the same order as main.jsx; only the API calls are mocked. The tests check
// the address, not the checkout page's text, so they keep working when Sezin's real page arrives.
const LOGIN_FOR_CHECKOUT = '/login?redirect=%2Fcheckout&reason=checkout';
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' };
const grinder = {
  id: 40,
  name: 'Zassenhaus Manaos Hand Grinder',
  model: 'Manaos',
  serialNumber: 'CRM-GR-8004',
  price: 4199,
  imageCount: 4,
  quantityInStock: 14,
};
const guestItems = addGuestItem([], grinder, 2);

// Every address the site showed, in order, so a test can tell that a page was never opened.
let visited = [];

function CurrentAddress() {
  const { pathname, search } = useLocation();
  const current = `${pathname}${search}`;
  useEffect(() => {
    visited.push(current);
  }, [current]);
  return <p data-testid="address">{current}</p>;
}

function renderSite(start) {
  visited = [];
  return render(
    <MemoryRouter initialEntries={[start]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
            <CurrentAddress />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const address = () => screen.getByTestId('address');
const atCheckout = () => waitFor(() => expect(address()).toHaveTextContent(/^\/checkout$/));

async function logIn(user, password = 'Demo1234') {
  await user.clear(screen.getByLabelText('Email'));
  await user.type(screen.getByLabelText('Email'), 'customer@crema.com');
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

afterEach(() => vi.restoreAllMocks());

describe('checkout needs login', () => {
  it('takes a guest from the cart to login and back to checkout, and moves the guest cart to the account', async () => {
    saveGuestItems(guestItems);
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: customer, token: 'new-token' });
    // The account already had 1 grinder, so with the 2 from the guest cart it holds 3.
    const merge = vi
      .spyOn(cartApi, 'merge')
      .mockResolvedValueOnce({ cart: buildCart(addGuestItem([], grinder, 3)) });
    const user = userEvent.setup();
    renderSite('/cart');

    await user.click(await screen.findByRole('link', { name: /log in to check out/i }));
    expect(address()).toHaveTextContent(LOGIN_FOR_CHECKOUT);
    expect(screen.getByText('Please log in to continue to checkout.')).toBeInTheDocument();

    await logIn(user);
    await atCheckout();
    expect(merge).toHaveBeenCalledWith([{ productId: 40, quantity: 2 }]);
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('3'));
    expect(localStorage.getItem('crema_guest_cart')).toBeNull();
  });

  it('brings a new customer who creates an account instead back to checkout too', async () => {
    saveGuestItems(guestItems);
    const register = vi.spyOn(authApi, 'register').mockResolvedValueOnce({ user: customer, token: 'new-token' });
    vi.spyOn(cartApi, 'merge').mockResolvedValueOnce({ cart: buildCart(guestItems) });
    const user = userEvent.setup();
    renderSite('/checkout');

    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    expect(address()).toHaveTextContent('/register?redirect=%2Fcheckout');

    await user.type(screen.getByLabelText('Full name'), 'Demo Customer');
    await user.type(screen.getByLabelText('Email'), 'customer@crema.com');
    await user.type(screen.getByLabelText('Password'), 'Demo1234');
    await user.type(screen.getByLabelText('Tax ID'), '1234567890');
    await user.type(screen.getByLabelText('Home address'), 'Sabancı University, Tuzla, İstanbul');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await atCheckout();
    expect(register).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBe('new-token');
  });

  it('keeps a guest on the login page after a wrong password, and lets them in after the right one', async () => {
    vi.spyOn(authApi, 'login')
      .mockRejectedValueOnce(Object.assign(new Error('Email or password is incorrect'), { status: 401 }))
      .mockResolvedValueOnce({ user: customer, token: 'new-token' });
    vi.spyOn(cartApi, 'get').mockResolvedValueOnce({ cart: buildCart([]) });
    const user = userEvent.setup();
    renderSite('/checkout');

    await logIn(user, 'wrong-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(address()).toHaveTextContent(LOGIN_FOR_CHECKOUT);
    expect(tokenStore.get()).toBeNull();

    await logIn(user);
    await atCheckout();
  });

  // A customer who is already logged in (saved token) is the other side of "guest blocked".
  function renderLoggedIn(start) {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValueOnce({ user: customer });
    vi.spyOn(cartApi, 'get').mockResolvedValueOnce({ cart: buildCart([]) });
    renderSite(start);
    // "Orders" is in the header only for a logged-in user, so the saved token has been checked.
    return screen.findByRole('link', { name: 'Orders' });
  }

  it('lets a logged-in customer straight into checkout, without showing the login page on the way', async () => {
    await renderLoggedIn('/checkout');
    expect(visited).toEqual(['/checkout']);
  });

  it('sends a logged-in customer who opens the checkout login link on to checkout', async () => {
    await renderLoggedIn(LOGIN_FOR_CHECKOUT);
    await atCheckout();
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
  });
});
