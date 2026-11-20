import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('CatalogPage sort', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the sort menu with the default order selected', async () => {
    renderAt('/shop');
    await screen.findByText('51 PRODUCTS');
    const select = screen.getByRole('combobox', { name: 'Sort by' });
    expect(select).toHaveValue('');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Featured',
      'Price: low to high',
      'Price: high to low',
      'Most popular',
    ]);
  });

  it('sorts by price from low to high when chosen', async () => {
    const user = userEvent.setup();
    renderAt('/shop/grinders');
    await screen.findByText('4 PRODUCTS');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price_asc');
    expect(screen.getByTestId('address')).toHaveTextContent('/shop/grinders?sort=price_asc');
    expect(productNames()).toEqual([
      'Zassenhaus Manaos Hand Grinder',
      'KitchenAid Artisan Burr Grinder Medallion Silver',
      'Caso Barista Flavour Grinder',
      'Sage The Smart Grinder Pro',
    ]);
  });

  it('reads the sort from the address and sends it with category and search', async () => {
    const browse = vi.spyOn(productsApi, 'browse');
    renderAt('/shop/coffee?q=espresso&sort=price_desc');
    await screen.findByText('3 PRODUCTS');
    expect(browse).toHaveBeenCalledWith({ category: 'coffee', q: 'espresso', sort: 'price_desc' });
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price_desc');
  });

  it('puts the most popular products first', async () => {
    renderAt('/shop/coffee?sort=popularity');
    await screen.findByText('6 PRODUCTS');
    expect(productNames()[0]).toBe('Hola Sol Turkish Coffee 250 g');
  });

  it('keeps the sort when the category changes', async () => {
    renderAt('/shop?sort=price_desc');
    await screen.findByText('51 PRODUCTS');
    const chips = within(screen.getByRole('navigation', { name: 'Categories' }));
    expect(chips.getByRole('link', { name: 'Grinders' })).toHaveAttribute('href', '/shop/grinders?sort=price_desc');
  });

  it('removes the sort from the address when Featured is chosen again', async () => {
    const user = userEvent.setup();
    renderAt('/shop?q=grinder&sort=popularity');
    await screen.findByText(/PRODUCTS?$/);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), '');
    expect(screen.getByTestId('address')).toHaveTextContent(/^\/shop\?q=grinder$/);
  });

  it('ignores an unknown sort in the address', async () => {
    const browse = vi.spyOn(productsApi, 'browse');
    renderAt('/shop?sort=cheapest');
    await screen.findByText('51 PRODUCTS');
    expect(browse).toHaveBeenCalledWith({ category: undefined, q: '', sort: '' });
  });
});
