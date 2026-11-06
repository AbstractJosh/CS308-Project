import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Header from '../src/components/Header.jsx';
import Footer from '../src/components/Footer.jsx';

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output aria-label="location">{`${pathname}${search}`}</output>;
}

function renderLayout() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
      <Footer />
      <CurrentLocation />
    </MemoryRouter>
  );
}

describe('Header', () => {
  it('links to the main pages', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/cart');
  });

  it('opens the search bar and submits to the shop page', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), 'moka pot{Enter}');
    expect(screen.getByLabelText('location')).toHaveTextContent('/shop?q=moka%20pot');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('goes to the shop without a query when the search is empty', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), '   {Enter}');
    expect(screen.getByLabelText('location').textContent).toBe('/shop');
  });

  it('toggles the mobile menu', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('link', { name: 'Shop' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Footer', () => {
  it('shows the course and team line', () => {
    renderLayout();
    expect(screen.getByText('CS308 Software Engineering · Team 10 · Sabancı University')).toBeInTheDocument();
  });
});
