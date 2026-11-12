import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderDetailPage from '../src/pages/OrderDetailPage.jsx';
import { fakeOrdersApi } from '../src/pages/OrderHistoryPage.fakeData.js';
import { ordersApi } from '../src/api/endpoints.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(ordersApi, 'get').mockImplementation((id) => fakeOrdersApi.get(id));
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the items with the prices paid and line totals', async () => {
    renderAt('/orders/14');
    expect(await screen.findByRole('heading', { level: 1, name: 'Order #14' })).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByRole('link', { name: 'Hola Sol Espresso Italiano Beans 250 g' })).toHaveAttribute(
      'href',
      '/products/31'
    );
    expect(within(items[1]).getByText('2 × ₺549.00')).toBeInTheDocument();
    expect(within(items[1]).getByText('₺1,098.00')).toBeInTheDocument();
  });

  it('shows the status, total, card, address and delivery date', async () => {
    renderAt('/orders/14');
    await screen.findByRole('heading', { level: 1, name: 'Order #14' });
    expect(screen.getByText('Delivered')).toHaveClass('status-delivered');
    expect(screen.getByText('Placed on 28 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('₺51,097.00')).toBeInTheDocument();
    expect(screen.getByText('Ending in 4242')).toBeInTheDocument();
    expect(screen.getByText('Sabancı University, Orta Mahalle, Tuzla, İstanbul')).toBeInTheDocument();
    expect(screen.getByText('2 Nov 2026')).toBeInTheDocument();
  });

  it('leaves out the delivery date while the order is on its way', async () => {
    renderAt('/orders/17');
    await screen.findByRole('heading', { level: 1, name: 'Order #17' });
    expect(screen.getByText('In transit')).toHaveClass('status-in-transit');
    expect(screen.queryByText('Delivered on')).not.toBeInTheDocument();
  });

  it('shows a message for an order that does not exist', async () => {
    renderAt('/orders/999');
    expect(await screen.findByText('Order not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to orders' })).toHaveAttribute('href', '/orders');
  });

  it('shows other errors with a way to try again', async () => {
    vi.spyOn(ordersApi, 'get').mockRejectedValueOnce(new Error('Cannot reach the server.'));
    renderAt('/orders/14');
    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
