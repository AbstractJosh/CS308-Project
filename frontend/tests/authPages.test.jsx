import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage.jsx';
import RegisterPage from '../src/pages/RegisterPage.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

// The real AuthProvider is used and only authApi is mocked, so no backend is needed.
const demoUser = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' };

function apiError(status, message, details) {
  return Object.assign(new Error(message), { status, details });
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/checkout" element={<p>Checkout page</p>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('LoginPage', () => {
  it('shows the mistakes and does not call the API for an empty form', async () => {
    const login = vi.spyOn(authApi, 'login');
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in, saves the token and goes back to ?redirect', async () => {
    const login = vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: demoUser, token: 'new-token' });
    const user = userEvent.setup();
    renderAt('/login?redirect=%2Fcheckout&reason=checkout');
    expect(screen.getByText('Please log in to continue to checkout.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), ' customer@crema.com ');
    await user.type(screen.getByLabelText('Password'), 'Demo1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Checkout page')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({ email: 'customer@crema.com', password: 'Demo1234' });
    expect(tokenStore.get()).toBe('new-token');
    expect(screen.getByRole('status')).toHaveTextContent('You are logged in');
  });

  it('shows "Email or password is incorrect" from the API and stays on the page', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValueOnce(apiError(401, 'Email or password is incorrect'));
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'customer@crema.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(tokenStore.get()).toBeNull();
  });

  it('never redirects to another website', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: demoUser, token: 'new-token' });
    const user = userEvent.setup();
    renderAt('/login?redirect=https%3A%2F%2Fevil.example');
    await user.type(screen.getByLabelText('Email'), 'customer@crema.com');
    await user.type(screen.getByLabelText('Password'), 'Demo1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('keeps ?redirect on the link to the register page', () => {
    renderAt('/login?redirect=%2Fcheckout');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register?redirect=%2Fcheckout'
    );
  });
});

describe('RegisterPage', () => {
  async function fillForm(user, changes = {}) {
    const values = {
      'Full name': 'Demo Customer',
      Email: 'customer@crema.com',
      Password: 'Demo1234',
      'Tax ID': '1234567890',
      'Home address': 'Sabancı University, Tuzla, İstanbul',
      ...changes,
    };
    for (const [label, value] of Object.entries(values)) {
      if (value) await user.type(screen.getByLabelText(label), value);
    }
  }

  it('shows the handbook 7.2 mistakes and does not call the API', async () => {
    const register = vi.spyOn(authApi, 'register');
    const user = userEvent.setup();
    renderAt('/register');
    await fillForm(user, { Password: 'abcdefgh', 'Tax ID': '12345', 'Home address': 'Short' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Password must contain a number')).toBeInTheDocument();
    expect(screen.getByText('Tax ID must be 10 or 11 digits')).toBeInTheDocument();
    expect(screen.getByText('Home address must be 10 to 300 characters')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('only lets digits into the tax ID field', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    await user.type(screen.getByLabelText('Tax ID'), '12ab-34');
    expect(screen.getByLabelText('Tax ID')).toHaveValue('1234');
  });

  it('creates the account with the five customer fields and logs the user in', async () => {
    const register = vi.spyOn(authApi, 'register').mockResolvedValueOnce({ user: demoUser, token: 'new-token' });
    const user = userEvent.setup();
    renderAt('/register');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith({
      name: 'Demo Customer',
      email: 'customer@crema.com',
      password: 'Demo1234',
      taxId: '1234567890',
      homeAddress: 'Sabancı University, Tuzla, İstanbul',
    });
    expect(tokenStore.get()).toBe('new-token');
  });

  it('shows "email already exists" under the email field', async () => {
    vi.spyOn(authApi, 'register').mockRejectedValueOnce(
      apiError(409, 'An account with this email already exists')
    );
    const user = userEvent.setup();
    renderAt('/register');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
