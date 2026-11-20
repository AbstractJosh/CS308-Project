import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderHistoryPage from '../src/pages/OrderHistoryPage.jsx';
import OrderDetailPage from '../src/pages/OrderDetailPage.jsx';
import { fakeOrdersApi } from '../src/pages/OrderHistoryPage.fakeData.js';
import { ordersApi } from '../src/api/endpoints.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.spyOn(ordersApi, 'list').mockImplementation(() => fakeOrdersApi.list());
    vi.spyOn(ordersApi, 'get').mockImplementation((id) => fakeOrdersApi.get(id));
  });

  afterEach(() => vi.restoreAllMocks());

  it('lists the orders newest first', async () => {
    renderAt('/orders');
    const rows = await screen.findAllByRole('link', { name: /Order #/ });
    expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/orders/21', '/orders/17', '/orders/14', '/orders/9']);
  });

  it('shows the status badge, date, items and total of each order', async () => {
    renderAt('/orders');
    const rows = await screen.findAllByRole('link', { name: /Order #/ });
    expect(within(rows[0]).getByText('Processing')).toHaveClass('status-pill', 'status-processing');
    expect(within(rows[1]).getByText('In transit')).toHaveClass('status-in-transit');
    expect(within(rows[2]).getByText('Delivered')).toHaveClass('status-delivered');
    expect(within(rows[2]).getByText(/Order #14 · 28 Oct 2026/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/3 items · Sage The Bambino Plus, Hola Sol Espresso Italiano/)).toBeInTheDocument();
    expect(within(rows[2]).getByText('₺51,097.00')).toBeInTheDocument();
  });

  it('opens the order detail when an order is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/orders');
    await user.click((await screen.findAllByRole('link', { name: /Order #/ }))[1]);
    expect(await screen.findByRole('heading', { level: 1, name: 'Order #17' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no orders', async () => {
    vi.spyOn(ordersApi, 'list').mockResolvedValueOnce({ orders: [] });
    renderAt('/orders');
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('shows the error and tries again', async () => {
    const user = userEvent.setup();
    vi.spyOn(ordersApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server.'));
    renderAt('/orders');
    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('link', { name: /Order #/ })).toHaveLength(4);
  });
});
