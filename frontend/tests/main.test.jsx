import { it, expect, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { tokenStore } from '../src/api/client.js';

// The real App is replaced, so this test checks only how main.jsx wires things together
// and keeps working when the real pages and their API calls arrive.
vi.mock('../src/App.jsx', async () => {
  const { useAuth } = await import('../src/context/AuthContext.jsx');
  return {
    default: function App() {
      const { user } = useAuth();
      return <p>{user ? `hello ${user.name}` : 'guest'}</p>;
    },
  };
});

it('puts the app inside AuthProvider, so a saved token logs the user in on load', async () => {
  tokenStore.set('saved');
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ user: { id: 1, name: 'Demo Customer' } }),
  });
  vi.stubGlobal('fetch', fetchMock);
  document.body.innerHTML = '<div id="root"></div>';

  await act(() => import('../src/main.jsx'));

  expect(await screen.findByText('hello Demo Customer')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/auth/me',
    expect.objectContaining({ headers: { Authorization: 'Bearer saved' } })
  );
  vi.unstubAllGlobals();
});
