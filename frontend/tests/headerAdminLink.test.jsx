import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../src/components/Header.jsx';
import { useAuth } from '../src/context/AuthContext.jsx';

vi.mock('../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

function renderAt(path, role) {
  useAuth.mockReturnValue({ user: { id: 2, name: 'Staff', role } });
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
    </MemoryRouter>
  );
}

describe('Header Admin link', () => {
  afterEach(() => useAuth.mockReturnValue({ user: null }));

  it.each([
    ['/admin/deliveries', 'PRODUCT_MANAGER'],
    ['/admin/products', 'PRODUCT_MANAGER'],
    ['/admin', 'PRODUCT_MANAGER'],
    ['/admin/pricing', 'SALES_MANAGER'],
    ['/admin/reports', 'SALES_MANAGER'],
  ])('stays highlighted on %s for %s', (path, role) => {
    renderAt(path, role);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveClass('active');
  });

  it('keeps going to the first page of the role', () => {
    renderAt('/admin/products', 'PRODUCT_MANAGER');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin/deliveries');
  });

  it('is not highlighted outside the admin area', () => {
    renderAt('/shop', 'PRODUCT_MANAGER');
    expect(screen.getByRole('link', { name: 'Admin' })).not.toHaveClass('active');
  });

  it('highlights the support agent link only on /support', () => {
    renderAt('/support', 'SUPPORT_AGENT');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveClass('active');
  });
});
