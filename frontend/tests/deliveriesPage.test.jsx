import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveriesPage from '../src/pages/admin/DeliveriesPage.jsx';
import { adminApi } from '../src/api/endpoints.js';

// SCRUM-57: the product manager's delivery list (req 12). Only the API call is mocked.
const open = {
  id: 7,
  orderId: 3,
  customerId: 1,
  productId: 40,
  productName: 'Zassenhaus Manaos Hand Grinder',
  quantity: 2,
  totalPrice: 8398,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  completed: false,
  orderStatus: 'IN_TRANSIT',
};
const done = { ...open, id: 4, orderId: 2, productName: 'Bialetti Thermos 750 ml Grey', quantity: 1, totalPrice: 1799, completed: true, orderStatus: 'DELIVERED' };

afterEach(() => vi.restoreAllMocks());

describe('DeliveriesPage', () => {
  it('shows the open deliveries first, with every handbook field', async () => {
    const list = vi.spyOn(adminApi, 'deliveries').mockResolvedValue({ deliveries: [open] });
    render(<DeliveriesPage />);
    expect(list).toHaveBeenCalledWith(false);

    const row = (await screen.findByText('Zassenhaus Manaos Hand Grinder')).closest('tr');
    for (const text of ['#7', '#3', '#1', 'Product #40', '2', '₺8,398.00', 'Orta Mahalle, Tuzla, Istanbul', 'In transit', 'No']) {
      expect(within(row).getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'To deliver' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to completed and all deliveries', async () => {
    const list = vi
      .spyOn(adminApi, 'deliveries')
      .mockResolvedValueOnce({ deliveries: [open] })
      .mockResolvedValueOnce({ deliveries: [done] })
      .mockResolvedValueOnce({ deliveries: [open, done] });
    const user = userEvent.setup();
    render(<DeliveriesPage />);
    await screen.findByText('Zassenhaus Manaos Hand Grinder');

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    const row = (await screen.findByText('Bialetti Thermos 750 ml Grey')).closest('tr');
    expect(within(row).getByText('Yes')).toBeInTheDocument();
    expect(within(row).getByText('Delivered')).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(await screen.findAllByRole('row')).toHaveLength(3); // header + 2
    expect(list).toHaveBeenLastCalledWith(undefined);
  });

  it('says when there is nothing to deliver', async () => {
    vi.spyOn(adminApi, 'deliveries').mockResolvedValue({ deliveries: [] });
    render(<DeliveriesPage />);
    expect(await screen.findByText('Nothing to deliver right now. New orders show up here.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error and loads again with Try again', async () => {
    const list = vi
      .spyOn(adminApi, 'deliveries')
      .mockRejectedValueOnce(new Error('Cannot reach the server. Is the backend running?'))
      .mockResolvedValueOnce({ deliveries: [open] });
    const user = userEvent.setup();
    render(<DeliveriesPage />);
    expect(await screen.findByText('Cannot reach the server. Is the backend running?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Zassenhaus Manaos Hand Grinder')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('builds the API path with the completed filter', () => {
    const calls = [];
    vi.spyOn(adminApi, 'deliveries').mockImplementation((completed) => {
      calls.push(completed);
      return Promise.resolve({ deliveries: [] });
    });
    render(<DeliveriesPage />);
    expect(calls).toEqual([false]);
  });
});
