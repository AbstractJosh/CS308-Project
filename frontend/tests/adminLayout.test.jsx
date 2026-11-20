import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { tokenStore } from '../src/api/client.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { ADMIN_MENU, menuItem, isAdminPage } from '../src/pages/admin/adminMenu.js';

// SCRUM-56: /admin is only for product and sales managers (req 8, 17).
// Only fetch is fake: GET /auth/me answers with the user of each test, so the real
// AuthProvider, RoleRoute and AdminLayout run.
const fetchMock = vi.fn();
const reply = (status, body) => ({ ok: status < 400, status, json: () => Promise.resolve(body) });
const userWithRole = (role) => ({ id: 2, name: 'Demo User', email: 'demo@crema.com', role });

function CurrentAddress() {
  const { pathname, search } = useLocation();
  return <p data-testid="address">{`${pathname}${search}`}</p>;
}

function renderAt(path, role) {
  if (role) {
    tokenStore.set('saved-token');
    fetchMock.mockImplementation((url) =>
      Promise.resolve(String(url).endsWith('/auth/me') ? reply(200, { user: userWithRole(role) }) : reply(200, {}))
    );
  }
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

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(reply(200, {}));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('admin area', () => {
  it('sends a guest to login and back to the admin page afterwards', () => {
    renderAt('/admin/deliveries');
    expect(screen.getByTestId('address')).toHaveTextContent('/login?redirect=%2Fadmin%2Fdeliveries');
  });

  it('shows "No access" to a customer', async () => {
    renderAt('/admin/deliveries', 'CUSTOMER');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Admin pages' })).not.toBeInTheDocument();
  });

  it('shows "No access" to a support agent, who uses /support instead', async () => {
    renderAt('/admin', 'SUPPORT_AGENT');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
  });

  it('opens the first product manager page from /admin, with only product manager links', async () => {
    renderAt('/admin', 'PRODUCT_MANAGER');
    expect(await screen.findByText('Product manager')).toBeInTheDocument();
    // The redirect from /admin happens just after the first render, so wait for it.
    await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(/^\/admin\/deliveries$/));
    const links = screen.getAllByRole('link').filter((link) => link.className.includes('admin-menu-link'));
    expect(links.map((link) => link.textContent)).toEqual(['Deliveries', 'Products', 'Stock', 'Comments', 'Invoices']);
    // Deliveries is a real page since SCRUM-57.
    expect(await screen.findByRole('heading', { name: 'Delivery list' })).toBeInTheDocument();
  });

  it('shows the sales manager their own pages', async () => {
    renderAt('/admin/reports', 'SALES_MANAGER');
    expect(await screen.findByText('Sales manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Deliveries' })).not.toBeInTheDocument();
    expect(await screen.findByText('This page is built in Sprint 4.')).toBeInTheDocument();
  });

  it("blocks a manager from the other manager's page", async () => {
    renderAt('/admin/pricing', 'PRODUCT_MANAGER');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    // The menu stays, so the product manager can go back to their own pages.
    expect(screen.getByRole('link', { name: 'Deliveries' })).toBeInTheDocument();
  });

  it('gives "Page not found" for an admin address that does not exist', async () => {
    renderAt('/admin/nothing-here', 'PRODUCT_MANAGER');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('adminMenu', () => {
  it('gives every menu page a label and a sprint, and no duplicates per role', () => {
    for (const items of Object.values(ADMIN_MENU)) {
      const paths = items.map((item) => item.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const item of items) expect(item.label && item.sprint).toBeTruthy();
    }
  });

  it('lets both managers open invoices but only the sales manager open pricing', () => {
    expect(menuItem('PRODUCT_MANAGER', 'invoices')).toBeTruthy();
    expect(menuItem('SALES_MANAGER', 'invoices')).toBeTruthy();
    expect(menuItem('PRODUCT_MANAGER', 'pricing')).toBeUndefined();
    expect(menuItem('CUSTOMER', 'deliveries')).toBeUndefined();
    expect(isAdminPage('pricing')).toBe(true);
    expect(isAdminPage('nothing-here')).toBe(false);
  });
});
