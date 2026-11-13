import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CatalogPage from '../src/pages/CatalogPage.jsx';
import { productsApi } from '../src/api/endpoints.js';

vi.mock('../src/api/endpoints.js', () => import('./fixtures/fakeCatalog.js'));

function Address() {
  const location = useLocation();
  return <output data-testid="address">{`${location.pathname}${location.search}`}</output>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/shop" element={<CatalogPage />} />
        <Route path="/shop/:category" element={<CatalogPage />} />
      </Routes>
      <Address />
    </MemoryRouter>
  );
}

const productNames = () =>
  screen.getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent);

describe('CatalogPage search and sort together', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the search when the sort changes', async () => {
    const user = userEvent.setup();
    const browse = vi.spyOn(productsApi, 'browse');
    renderAt('/shop?q=moka');
    await screen.findByText('2 PRODUCTS');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price_desc');
    expect(screen.getByTestId('address').textContent).toBe('/shop?q=moka&sort=price_desc');
    expect(browse).toHaveBeenLastCalledWith({ category: undefined, q: 'moka', sort: 'price_desc' });
    expect(screen.getByText(/Results for “moka”/)).toBeInTheDocument();
  });

  it('shows the search results in the chosen order', async () => {
    const user = userEvent.setup();
    renderAt('/shop?q=moka&sort=price_desc');
    await screen.findByText('2 PRODUCTS');
    expect(productNames()).toEqual(['Bialetti Rainbow Moka Pot 3 Cup Light Blue', 'Bialetti Moka Express 1 Cup']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price_asc');
    await waitFor(() =>
      expect(productNames()).toEqual(['Bialetti Moka Express 1 Cup', 'Bialetti Rainbow Moka Pot 3 Cup Light Blue'])
    );
  });

  it('keeps the sort but drops the search in the Clear search link', async () => {
    renderAt('/shop/coffee?q=espresso&sort=popularity');
    expect(await screen.findByRole('link', { name: 'Clear search' })).toHaveAttribute(
      'href',
      '/shop/coffee?sort=popularity'
    );
  });

  it('goes back to the sorted shop when Clear search is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/shop?q=moka&sort=price_desc');
    await user.click(await screen.findByRole('link', { name: 'Clear search' }));
    expect(await screen.findByText('51 PRODUCTS')).toBeInTheDocument();
    expect(screen.getByTestId('address').textContent).toBe('/shop?sort=price_desc');
    expect(screen.getByRole('heading', { level: 1, name: 'Our shop' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price_desc');
  });

  it('keeps both the search and the sort on the category chips', async () => {
    renderAt('/shop?q=beans&sort=price_asc');
    await screen.findByText(/PRODUCTS?$/);
    const chips = within(screen.getByRole('navigation', { name: 'Categories' }));
    expect(chips.getByRole('link', { name: 'Coffee' })).toHaveAttribute('href', '/shop/coffee?q=beans&sort=price_asc');
    expect(chips.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/shop?q=beans&sort=price_asc');
  });

  it('explains an empty search and offers one way back that keeps the sort', async () => {
    renderAt('/shop?q=teapot&sort=price_asc');
    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.getByText('Nothing matches “teapot”. Try another word.')).toBeInTheDocument();
    expect(screen.getByText('0 PRODUCTS')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Clear search' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/shop?sort=price_asc');
  });
});
