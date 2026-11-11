import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';

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

afterEach(() => localStorage.clear());

describe('order routes need login', () => {
  it.each([
    ['/orders', '/login?redirect=%2Forders'],
    ['/orders/14', '/login?redirect=%2Forders%2F14'],
  ])('sends a guest from %s to login', (path, loginPath) => {
    renderAt(path);
    expect(screen.getByTestId('address')).toHaveTextContent(loginPath);
  });
});
