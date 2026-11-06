import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage.jsx';
import { categoriesApi } from '../src/utils/fakeCatalog.js';

function renderHome() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the hero with its two actions', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Better coffee,starts at home.');
    expect(screen.getByRole('link', { name: 'Shop machines' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Explore coffee' })).toHaveAttribute('href', '/shop/coffee');
  });

  it('shows the real product and category counts', async () => {
    renderHome();
    await screen.findByText('10 CATEGORIES');
    expect(screen.getByText('51')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2-year')).toBeInTheDocument();
  });

  it('features the most popular espresso machine that is in stock', async () => {
    renderHome();
    await screen.findByText('10 CATEGORIES');
    expect(screen.getByRole('link', { name: /Sage The Barista Express Impress.*₺99,999\.00/ })).toHaveAttribute(
      'href',
      '/products/3'
    );
    const [photo] = screen.getAllByRole('img', { name: 'Sage The Barista Express Impress' });
    expect(photo).toHaveAttribute('src', '/images/products/CRM-EM-1003/01.jpg');
  });

  it('lists all categories with links', async () => {
    renderHome();
    const heading = await screen.findByRole('heading', { level: 2, name: 'Shop by category' });
    const section = within(heading.closest('section'));
    expect(section.getAllByRole('link')).toHaveLength(10);
    expect(section.getByRole('link', { name: /Grinders/ })).toHaveAttribute('href', '/shop/grinders');
  });

  it('shows the three most popular products', async () => {
    renderHome();
    const heading = await screen.findByRole('heading', { level: 2, name: 'Our best sellers' });
    const section = within(heading.closest('section'));
    const names = section.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent);
    expect(names).toEqual([
      'Hola Sol Turkish Coffee 250 g',
      'Sage The Barista Express Impress',
      'Hola Sol Espresso Italiano Beans 250 g',
    ]);
  });

  it('shows the error and tries again', async () => {
    const user = userEvent.setup();
    vi.spyOn(categoriesApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server.'));
    renderHome();
    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('10 CATEGORIES')).toBeInTheDocument();
  });
});
