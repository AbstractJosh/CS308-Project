import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

const customer = {
  id: 1,
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
  homeAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
  role: 'CUSTOMER',
};

function CurrentAddress() {
  const { pathname, search } = useLocation();
  return <p data-testid="address">{`${pathname}${search}`}</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <App />
          <CurrentAddress />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function logInAs(user) {
  tokenStore.set('saved-token');
  vi.spyOn(authApi, 'me').mockResolvedValue({ user });
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('ProfilePage', () => {
  it('sends a guest to login', () => {
    renderAt('/profile');
    expect(screen.getByTestId('address')).toHaveTextContent('/login?redirect=%2Fprofile');
  });

  it('shows the name, email and home address of the logged-in user', async () => {
    logInAs(customer);
    renderAt('/profile');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Demo' })).toBeInTheDocument();
    expect(screen.getByText('Demo Customer')).toBeInTheDocument();
    expect(screen.getByText('customer@crema.com')).toBeInTheDocument();
    expect(screen.getByText('Sabancı University, Orta Mahalle, Tuzla, İstanbul')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your orders' })).toHaveAttribute('href', '/orders');
  });

  it('logs out, forgets the token and goes to the home page', async () => {
    const user = userEvent.setup();
    logInAs(customer);
    renderAt('/profile');
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(/^\/$/));
    expect(tokenStore.get()).toBeNull();
    expect(screen.getByText('You are logged out')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/login');
  });
});
