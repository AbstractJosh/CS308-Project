import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi } from '../src/api/endpoints.js';

// SCRUM-42 (handbook 7.3). The real routes, login page and AuthProvider run; only the login
// call is mocked. It checks the address, so it keeps working when Sezin's real page arrives.
function CurrentAddress() {
  const { pathname, search } = useLocation();
  return <p data-testid="address">{`${pathname}${search}`}</p>;
}

afterEach(() => vi.restoreAllMocks());

describe('checkout needs login', () => {
  it('sends a guest to login and back to checkout, with the guest cart kept', async () => {
    const guestCart = JSON.stringify([{ productId: 1, quantity: 2 }]);
    localStorage.setItem('crema_guest_cart', guestCart);
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      user: { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' },
      token: 'new-token',
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/checkout']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthProvider>
            <App />
            <CurrentAddress />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('address')).toHaveTextContent('/login?redirect=%2Fcheckout&reason=checkout');
    expect(screen.getByText('Please log in to continue to checkout.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'customer@crema.com');
    await user.type(screen.getByLabelText('Password'), 'Demo1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(/^\/checkout$/));
    expect(localStorage.getItem('crema_guest_cart')).toBe(guestCart);
  });
});
