import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from '../src/pages/admin/ProductsPage.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { fakeAdminProductsApi, resetFakeProducts } from '../src/pages/admin/ProductsPage.fakeData.js';

function renderPage() {
  return render(
    <ToastProvider>
      <ProductsPage />
    </ToastProvider>
  );
}

async function rowOf(name) {
  return (await screen.findByText(name)).closest('tr');
}

async function fillValidProduct(user, form) {
  await user.type(within(form).getByLabelText('Name'), 'Hario V60 Dripper 02');
  await user.type(within(form).getByLabelText('Model'), 'VDC-02');
  await user.type(within(form).getByLabelText('Serial number'), 'CRM-FL-3009');
  await user.selectOptions(within(form).getByLabelText('Category'), 'Filter Coffee Machines');
  await user.type(within(form).getByLabelText('Price (TRY)'), '649');
  await user.type(within(form).getByLabelText('Stock'), '12');
  await user.type(within(form).getByLabelText('Warranty'), 'No warranty');
  await user.type(within(form).getByLabelText('Distributor'), 'Hario official distributor');
  await user.type(within(form).getByLabelText('Description'), 'Ceramic pour-over dripper for two cups.');
}

describe('Admin ProductsPage', () => {
  beforeEach(() => resetFakeProducts());

  afterEach(() => vi.restoreAllMocks());

  it('lists the 8 products with their details and the count', async () => {
    renderPage();
    const row = await rowOf('Jura E6 Piano Black');
    for (const text of ['E6 (EC)', 'CRM-AM-2001', 'Fully Automatic Machines', '₺79,999.00', '7']) {
      expect(within(row).getByText(text)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('row')).toHaveLength(9);
    expect(screen.getByText('8 PRODUCTS')).toBeInTheDocument();
  });

  it('shows Sold out for the product with no stock', async () => {
    renderPage();
    const row = await rowOf('Sage The Oracle Dual Boiler');
    expect(within(row).getByText('Sold out')).toBeInTheDocument();
    expect(screen.getAllByText('Sold out')).toHaveLength(1);
  });

  it('shows the required messages when an empty form is saved and adds nothing', async () => {
    const create = vi.spyOn(fakeAdminProductsApi, 'create');
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add product' }));
    const form = screen.getByRole('form', { name: 'Add product' });
    expect(screen.getByRole('button', { name: 'Add product' })).toBeDisabled();

    await user.click(within(form).getByRole('button', { name: 'Save product' }));
    const messages = [
      'Name is required',
      'Model is required',
      'Serial number is required',
      'Choose a category',
      'Price is required',
      'Stock is required',
      'Warranty is required',
      'Distributor is required',
      'Description is required',
    ];
    for (const message of messages) {
      expect(within(form).getByText(message, { selector: '.field-error' })).toBeInTheDocument();
    }
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText('8 PRODUCTS')).toBeInTheDocument();
  });

  it('adds a valid product to the table', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add product' }));
    const form = screen.getByRole('form', { name: 'Add product' });
    await fillValidProduct(user, form);
    await user.click(within(form).getByRole('button', { name: 'Save product' }));

    const row = await rowOf('Hario V60 Dripper 02');
    expect(within(row).getByText('CRM-FL-3009')).toBeInTheDocument();
    expect(within(row).getByText('Filter Coffee Machines')).toBeInTheDocument();
    expect(within(row).getByText('₺649.00')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Add product' })).not.toBeInTheDocument();
    expect(screen.getByText('9 PRODUCTS')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Product added');
  });

  it('edits a product and shows the new price', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Edit Jura E6 Piano Black' }));
    const form = screen.getByRole('form', { name: 'Edit product' });
    expect(within(form).getByLabelText('Name')).toHaveValue('Jura E6 Piano Black');
    expect(within(form).getByLabelText('Serial number')).toHaveValue('CRM-AM-2001');
    expect(within(form).getByLabelText('Category')).toHaveValue('2');
    expect(within(form).getByLabelText('Cost (TRY)')).toHaveValue('');

    const price = within(form).getByLabelText('Price (TRY)');
    await user.clear(price);
    await user.type(price, '74999');
    await user.click(within(form).getByRole('button', { name: 'Save product' }));

    const row = await rowOf('Jura E6 Piano Black');
    expect(await within(row).findByText('₺74,999.00')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Edit product' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Product updated');
  });

  it('puts the focus in the Name field when the form opens', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add product' }));
    let form = screen.getByRole('form', { name: 'Add product' });
    expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveFocus();

    await user.click(within(form).getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Edit Jura E6 Piano Black' }));
    form = screen.getByRole('form', { name: 'Edit product' });
    const name = within(form).getByRole('textbox', { name: 'Name' });
    expect(name).toHaveFocus();
    expect(name).toHaveValue('Jura E6 Piano Black');
  });

  it('keeps the form open when the serial number is already used', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add product' }));
    const form = screen.getByRole('form', { name: 'Add product' });
    await fillValidProduct(user, form);
    const serial = within(form).getByLabelText('Serial number');
    await user.clear(serial);
    await user.type(serial, 'CRM-AM-2001');
    await user.click(within(form).getByRole('button', { name: 'Save product' }));

    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent('A product with this serial number already exists');
    expect(screen.getByRole('form', { name: 'Add product' })).toBeInTheDocument();
    expect(screen.getByText('8 PRODUCTS')).toBeInTheDocument();
  });

  it('asks before removing a product', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Remove Jura E6 Piano Black' }));
    let row = await rowOf('Jura E6 Piano Black');
    expect(within(row).getByText('Remove this product?')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Cancel' }));
    expect(within(row).queryByText('Remove this product?')).not.toBeInTheDocument();
    expect(screen.getByText('8 PRODUCTS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Jura E6 Piano Black' }));
    row = await rowOf('Jura E6 Piano Black');
    await user.click(within(row).getByRole('button', { name: 'Yes, remove' }));

    expect(await screen.findByText('7 PRODUCTS')).toBeInTheDocument();
    expect(screen.queryByText('Jura E6 Piano Black', { selector: 'td' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('"Jura E6 Piano Black" removed');
  });

  it('shows the error and loads again with Try again', async () => {
    const list = vi.spyOn(fakeAdminProductsApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server'));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Could not load the products')).toBeInTheDocument();
    expect(screen.getByText('Cannot reach the server')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Jura E6 Piano Black')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
