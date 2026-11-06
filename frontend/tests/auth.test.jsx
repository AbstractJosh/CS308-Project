import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { tokenStore } from '../src/api/client.js';
import ProtectedRoute from '../src/components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';

// Only fetch is fake, so the real api() and authApi run and no server is needed.
// These tests use small stand-in pages, so they keep working when the real pages arrive.
const fetchMock = vi.fn();
const reply = (status, body) => ({ ok: status < 400, status, json: () => Promise.resolve(body) });

// For answers that arrive later: const me = later(); ...; await act(async () => me.answer(...));
function later() {
  let answer;
  const promise = new Promise((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
}

const demoUser = {
  id: 1,
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
  role: 'CUSTOMER',
};
const form = {
  name: 'Demo Customer',
  email: 'customer@crema.com',
  password: 'Demo1234',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('useAuth', () => {
  let auth;
  function Probe() {
    auth = useAuth();
    if (auth.loading) return <p>checking</p>;
    return <p>{auth.user ? `hello ${auth.user.name}` : 'guest'}</p>;
  }
  const renderProbe = () =>
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

  describe('on load', () => {
    it('is a guest right away and calls nothing when no token is saved', () => {
      renderProbe();
      expect(screen.getByText('guest')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('checks a saved token with GET /auth/me while loading, then sets the user', async () => {
      tokenStore.set('saved');
      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser }));
      renderProbe();
      expect(screen.getByText('checking')).toBeInTheDocument();
      expect(await screen.findByText('hello Demo Customer')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer saved' },
        body: undefined,
      });
      expect(tokenStore.get()).toBe('saved');
    });

    it.each([
      ['expired or invalid', 401, 'Please log in first'],
      ['for a deleted user', 404, 'User not found'],
    ])('forgets a token that is %s', async (_label, status, error) => {
      tokenStore.set('saved');
      fetchMock.mockResolvedValueOnce(reply(status, { error }));
      renderProbe();
      expect(await screen.findByText('guest')).toBeInTheDocument();
      expect(tokenStore.get()).toBeNull();
    });

    it.each([
      ['has an error', () => fetchMock.mockResolvedValueOnce(reply(500, { error: 'Something went wrong' }))],
      ['is down', () => fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))],
    ])('keeps the token for the next load when the server %s', async (_label, answer) => {
      tokenStore.set('saved');
      answer();
      renderProbe();
      expect(await screen.findByText('guest')).toBeInTheDocument();
      expect(tokenStore.get()).toBe('saved');
    });
  });

  describe('login', () => {
    it('sends the email and password, saves the token and sets the user', async () => {
      renderProbe();
      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
      await act(() => auth.login('customer@crema.com', 'Demo1234'));

      expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@crema.com', password: 'Demo1234' }),
      });
      expect(tokenStore.get()).toBe('new-token');
      expect(screen.getByText('hello Demo Customer')).toBeInTheDocument();
    });

    it('stays logged in after a reload', async () => {
      const first = renderProbe();
      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
      await act(() => auth.login('customer@crema.com', 'Demo1234'));
      first.unmount();

      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser }));
      renderProbe();
      expect(await screen.findByText('hello Demo Customer')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/auth/me',
        expect.objectContaining({ headers: { Authorization: 'Bearer new-token' } })
      );
    });

    it('gives the error to the page, saves nothing and stays a guest when it fails', async () => {
      renderProbe();
      fetchMock.mockResolvedValueOnce(reply(401, { error: 'Email or password is incorrect' }));
      await act(async () => {
        await expect(auth.login('customer@crema.com', 'Wrong1234')).rejects.toMatchObject({
          status: 401,
          message: 'Email or password is incorrect',
        });
      });
      expect(tokenStore.get()).toBeNull();
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
  });

  describe('register', () => {
    it('sends the whole form, saves the token and sets the user', async () => {
      renderProbe();
      fetchMock.mockResolvedValueOnce(reply(201, { user: demoUser, token: 'new-token' }));
      await act(() => auth.register(form));
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      expect(tokenStore.get()).toBe('new-token');
      expect(screen.getByText('hello Demo Customer')).toBeInTheDocument();
    });

    it('gives the field errors to the page, saves nothing and stays a guest when it fails', async () => {
      renderProbe();
      const details = [{ field: 'taxId', message: 'Tax ID must be 10 or 11 digits' }];
      fetchMock.mockResolvedValueOnce(reply(400, { error: details[0].message, details }));
      await act(async () => {
        await expect(auth.register({ ...form, taxId: '12' })).rejects.toMatchObject({ status: 400, details });
      });
      expect(tokenStore.get()).toBeNull();
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
  });

  it.each([
    ['login', '/api/auth/login', () => auth.login('customer@crema.com', 'Demo1234')],
    ['register', '/api/auth/register', () => auth.register(form)],
  ])('%s does not send an old saved token', async (_label, url, send) => {
    tokenStore.set('old');
    fetchMock.mockReturnValueOnce(later().promise); // the check of the old token never finishes
    renderProbe();
    fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
    await act(send);
    expect(fetchMock).toHaveBeenLastCalledWith(
      url,
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
  });

  describe('logout', () => {
    it('forgets the token and the user', async () => {
      tokenStore.set('saved');
      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser }));
      renderProbe();
      await screen.findByText('hello Demo Customer');

      act(() => auth.logout());

      expect(tokenStore.get()).toBeNull();
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
  });

  describe('when the token check is still running', () => {
    it('stays logged out if the user logs out before the answer arrives', async () => {
      tokenStore.set('saved');
      const me = later();
      fetchMock.mockReturnValueOnce(me.promise);
      renderProbe();

      act(() => auth.logout());
      await act(async () => me.answer(reply(200, { user: demoUser })));

      expect(screen.getByText('guest')).toBeInTheDocument();
      expect(tokenStore.get()).toBeNull();
    });

    it('keeps a new login if the old token is refused afterwards', async () => {
      tokenStore.set('old');
      const me = later();
      fetchMock.mockReturnValueOnce(me.promise);
      renderProbe();

      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
      await act(() => auth.login('customer@crema.com', 'Demo1234'));
      await act(async () => me.answer(reply(401, { error: 'Please log in first' })));

      expect(tokenStore.get()).toBe('new-token');
      expect(screen.getByText('hello Demo Customer')).toBeInTheDocument();
    });

    it('keeps the new user if the answer about the old token arrives afterwards', async () => {
      tokenStore.set('old');
      const me = later();
      fetchMock.mockReturnValueOnce(me.promise);
      renderProbe();

      fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
      await act(() => auth.login('customer@crema.com', 'Demo1234'));
      await act(async () => me.answer(reply(200, { user: { ...demoUser, name: 'Old Account' } })));

      expect(screen.getByText('hello Demo Customer')).toBeInTheDocument();
    });
  });

  it('acts as a guest outside an AuthProvider, so a component tested alone does not crash', () => {
    render(<Probe />);
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ProtectedRoute', () => {
  function LoginStandIn() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const redirect = params.get('redirect');
    async function logIn() {
      await login('customer@crema.com', 'Demo1234');
      navigate(redirect);
    }
    return (
      <>
        <p>login page, back to {redirect}</p>
        <button onClick={logIn}>log in</button>
      </>
    );
  }

  function SecretPage() {
    const { logout } = useAuth();
    return (
      <>
        <p>secret page</p>
        <button onClick={logout}>log out</button>
      </>
    );
  }

  function BackButton() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    return <button onClick={() => navigate(-1)}>back from {pathname}</button>;
  }

  function renderAt(entries) {
    return render(
      <MemoryRouter
        initialEntries={entries}
        initialIndex={entries.length - 1}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <BackButton />
          <Routes>
            <Route path="/" element={<p>home page</p>} />
            <Route path="/login" element={<LoginStandIn />} />
            <Route
              path="/secret"
              element={
                <ProtectedRoute>
                  <SecretPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('sends a guest to /login?redirect=<path>', () => {
    renderAt(['/secret']);
    expect(screen.getByText('login page, back to /secret')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('keeps the query string of the page inside redirect', () => {
    renderAt(['/secret?tab=2&sort=new']);
    expect(screen.getByText('login page, back to /secret?tab=2&sort=new')).toBeInTheDocument();
  });

  it('does not trap the back button on the redirect', async () => {
    const user = userEvent.setup();
    renderAt(['/', '/secret']);
    await user.click(screen.getByRole('button', { name: 'back from /login' }));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('shows neither the page nor the redirect until the saved token is checked', async () => {
    tokenStore.set('saved');
    const me = later();
    fetchMock.mockReturnValueOnce(me.promise);
    renderAt(['/secret']);
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();

    await act(async () => me.answer(reply(200, { user: demoUser })));
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });

  it('sends the user to login when the saved token is refused', async () => {
    tokenStore.set('saved');
    fetchMock.mockResolvedValueOnce(reply(401, { error: 'Please log in first' }));
    renderAt(['/secret']);
    expect(await screen.findByText('login page, back to /secret')).toBeInTheDocument();
  });

  it('comes back to the page after login without bouncing to login again', async () => {
    const user = userEvent.setup();
    renderAt(['/secret']);
    fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser, token: 'new-token' }));
    await user.click(screen.getByRole('button', { name: 'log in' }));
    await waitFor(() => expect(screen.getByText('secret page')).toBeInTheDocument());
    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
  });

  it('sends the user to login after logging out on the page', async () => {
    const user = userEvent.setup();
    tokenStore.set('saved');
    fetchMock.mockResolvedValueOnce(reply(200, { user: demoUser }));
    renderAt(['/secret']);
    await screen.findByText('secret page');
    await user.click(screen.getByRole('button', { name: 'log out' }));
    expect(screen.getByText('login page, back to /secret')).toBeInTheDocument();
  });
});
