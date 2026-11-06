import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { ToastProvider, useToast } from '../src/context/ToastContext.jsx';
import { api, tokenStore } from '../src/api/client.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  );
}

describe('App routes', () => {
  it('has a page for every Sprint 1 route', () => {
    for (const path of ['/', '/shop', '/shop/coffee', '/products/1', '/login', '/register']) {
      const { unmount } = renderAt(path);
      expect(screen.getByText('Coming soon')).toBeInTheDocument();
      unmount();
    }
  });

  it('shows the not found page for an unknown path', () => {
    renderAt('/nope');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  function Button() {
    const { notify } = useToast();
    return <button onClick={() => notify('Added to cart')}>Add</button>;
  }

  it('shows a message and hides it after about 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Button />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add'));
    expect(screen.getByRole('status')).toHaveTextContent('Added to cart');
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the saved token and returns the JSON body', async () => {
    tokenStore.set('abc');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer abc' },
    }));
  });

  it('throws an error with message, status and details from the error body', async () => {
    const body = { error: 'Enter a valid email', details: [{ field: 'email', message: 'Enter a valid email' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve(body) }));
    await expect(api('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      message: 'Enter a valid email',
      status: 400,
      details: body.details,
    });
  });
});
