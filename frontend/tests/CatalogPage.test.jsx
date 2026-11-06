import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CatalogPage from '../src/pages/CatalogPage.jsx';
import { productsApi } from '../src/utils/fakeCatalog.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/shop" element={<CatalogPage />} />
        <Route path="/shop/:category" element={<CatalogPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CatalogPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists every product and marks All as active on /shop', async () => {
    renderAt('/shop');
    expect(await screen.findByText('51 PRODUCTS')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(51);
    const chips = within(screen.getByRole('navigation', { name: 'Categories' }));
    expect(chips.getAllByRole('link')).toHaveLength(11);
    expect(chips.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows only the products of the chosen category', async () => {
    renderAt('/shop/coffee');
    expect(await screen.findByText('6 PRODUCTS')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('heading', { level: 1, name: 'Coffee' })).toBeInTheDocument();
    const chips = within(screen.getByRole('navigation', { name: 'Categories' }));
    expect(chips.getByRole('link', { name: 'Coffee' })).toHaveAttribute('aria-current', 'page');
    expect(chips.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current');
  });

  it('moves to another category when a chip is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/shop');
    await screen.findByText('51 PRODUCTS');
    await user.click(screen.getByRole('link', { name: 'Grinders' }));
    expect(await screen.findByText('4 PRODUCTS')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('shows a message for an unknown category', async () => {
    renderAt('/shop/tea');
    expect(await screen.findByText('Category not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('hides products that come back for an unknown category', async () => {
    const { products } = await productsApi.list('coffee');
    vi.spyOn(productsApi, 'list').mockResolvedValueOnce({ products });
    renderAt('/shop/COFFEE');
    expect(await screen.findByText('Category not found')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows the error and tries again', async () => {
    const user = userEvent.setup();
    vi.spyOn(productsApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server.'));
    renderAt('/shop');
    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('51 PRODUCTS')).toBeInTheDocument();
  });
});
