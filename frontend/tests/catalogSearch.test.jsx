import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CatalogPage from '../src/pages/CatalogPage.jsx';
import { productsApi } from '../src/api/endpoints.js';

vi.mock('../src/api/endpoints.js', () => import('./fixtures/fakeCatalog.js'));

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

describe('CatalogPage search', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the search term from the address to the API', async () => {
    const browse = vi.spyOn(productsApi, 'browse');
    renderAt('/shop?q=%20oracle%20');
    await screen.findByText('2 PRODUCTS');
    expect(browse).toHaveBeenCalledWith({ category: undefined, q: 'oracle', sort: '' });
  });

  it('shows the results with the search term in the title', async () => {
    renderAt('/shop?q=grinder');
    expect(await screen.findByRole('heading', { level: 1, name: 'Search results' })).toBeInTheDocument();
    expect(screen.getByText(/Results for “grinder”/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute('href', '/shop');
  });

  it('keeps sold out products in the results with the Sold out label', async () => {
    renderAt('/shop?q=oracle');
    await screen.findByText('2 PRODUCTS');
    const soldOut = screen
      .getAllByRole('article')
      .find((card) => within(card).queryByText('Sage The Oracle Dual Boiler'));
    expect(within(soldOut).getByText('SOLD OUT')).toBeInTheDocument();
  });

  it('keeps the search when a category chip is used', async () => {
    renderAt('/shop?q=beans');
    await screen.findByText(/PRODUCTS?$/);
    const chips = within(screen.getByRole('navigation', { name: 'Categories' }));
    expect(chips.getByRole('link', { name: 'Coffee' })).toHaveAttribute('href', '/shop/coffee?q=beans');
    expect(chips.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/shop?q=beans');
  });

  it('searches inside the chosen category', async () => {
    renderAt('/shop/coffee?q=espresso');
    expect(await screen.findByText('3 PRODUCTS')).toBeInTheDocument();
    expect(screen.getByText(/Results for “espresso” in Coffee/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute('href', '/shop/coffee');
  });

  it('shows a clear message when nothing matches', async () => {
    renderAt('/shop?q=teapot');
    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute('href', '/shop');
  });
});
