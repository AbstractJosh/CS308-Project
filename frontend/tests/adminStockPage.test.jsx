import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockPage from '../src/pages/admin/StockPage.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { fakeAdminProductsApi, resetFakeProducts } from '../src/pages/admin/ProductsPage.fakeData.js';

function renderPage() {
  return render(
    <ToastProvider>
      <StockPage />
    </ToastProvider>
  );
}

async function rowOf(name) {
  return (await screen.findByText(name)).closest('tr');
}

describe('Admin StockPage', () => {
  beforeEach(() => resetFakeProducts());

  afterEach(() => vi.restoreAllMocks());

  it('lists the products with their stock text and the count', async () => {
    renderPage();
    const row = await rowOf('Sage The Barista Express Impress');
    expect(within(row).getByText('9 in stock')).toBeInTheDocument();
    expect(within(row).getByText('CRM-EM-1003')).toBeInTheDocument();
    expect(within(row).getByText('SES876 BSS')).toBeInTheDocument();
    expect(within(row).getByLabelText('New stock for Sage The Barista Express Impress')).toHaveValue('9');

    const oracle = await rowOf('Sage The Oracle Dual Boiler');
    expect(within(oracle).getByText('Sold out')).toBeInTheDocument();
    expect(screen.queryByText(/Only \d+ left/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(9);
    expect(screen.getByText('8 PRODUCTS')).toBeInTheDocument();
  });

  it('keeps Save disabled until the quantity is changed', async () => {
    const user = userEvent.setup();
    renderPage();
    const save = await screen.findByRole('button', { name: 'Save stock for Jura E6 Piano Black' });
    expect(save).toBeDisabled();

    const input = screen.getByLabelText('New stock for Jura E6 Piano Black');
    await user.clear(input);
    await user.type(input, '4');
    expect(save).toBeEnabled();

    await user.clear(input);
    await user.type(input, '7');
    expect(save).toBeDisabled();
  });

  it('saves a new quantity and updates the stock text', async () => {
    const setStock = vi.spyOn(fakeAdminProductsApi, 'setStock');
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('New stock for Jura E6 Piano Black');
    await user.clear(input);
    await user.type(input, '3');
    await user.click(screen.getByRole('button', { name: 'Save stock for Jura E6 Piano Black' }));

    const row = await rowOf('Jura E6 Piano Black');
    expect(await within(row).findByText('Only 3 left')).toBeInTheDocument();
    expect(setStock).toHaveBeenCalledWith(9, 3);
    expect(screen.getByRole('status')).toHaveTextContent('Stock updated: Jura E6 Piano Black');
    expect(within(row).getByLabelText('New stock for Jura E6 Piano Black')).toHaveValue('3');
    expect(within(row).getByRole('button', { name: 'Save stock for Jura E6 Piano Black' })).toBeDisabled();
  });

  it('turns Sold out into Only 5 left', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('New stock for Sage The Oracle Dual Boiler');
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Save stock for Sage The Oracle Dual Boiler' }));

    const row = await rowOf('Sage The Oracle Dual Boiler');
    expect(await within(row).findByText('Only 5 left')).toBeInTheDocument();
    expect(within(row).queryByText('Sold out')).not.toBeInTheDocument();
  });

  it('shows the message for a value that is not a whole number and changes nothing', async () => {
    const setStock = vi.spyOn(fakeAdminProductsApi, 'setStock');
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('New stock for Jura E6 Piano Black');
    const save = screen.getByRole('button', { name: 'Save stock for Jura E6 Piano Black' });
    const row = input.closest('tr');

    for (const value of ['2.5', '-1', '']) {
      await user.clear(input);
      if (value) await user.type(input, value);
      await user.click(save);
      expect(within(row).getByRole('alert')).toHaveTextContent('Stock must be a whole number, 0 or more');
    }

    expect(setStock).not.toHaveBeenCalled();
    expect(within(row).getByText('7 in stock')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    await user.type(input, '1');
    expect(within(row).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error and loads again with Try again', async () => {
    const list = vi.spyOn(fakeAdminProductsApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server'));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Could not load the stock')).toBeInTheDocument();
    expect(screen.getByText('Cannot reach the server')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Jura E6 Piano Black')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
