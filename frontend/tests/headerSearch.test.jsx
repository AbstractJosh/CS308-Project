import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Header from '../src/components/Header.jsx';

vi.mock('../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output aria-label="location">{`${pathname}${search}`}</output>;
}

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
      <CurrentLocation />
    </MemoryRouter>
  );
}

describe('Header search', () => {
  it('trims the search term before going to the shop', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), '  moka pot  {Enter}');
    expect(screen.getByLabelText('location').textContent).toBe('/shop?q=moka%20pot');
  });

  it('encodes special characters in the address', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), 'café & milk{Enter}');
    expect(screen.getByLabelText('location').textContent).toBe('/shop?q=caf%C3%A9%20%26%20milk');
  });

  it('searches when the Search button in the bar is clicked', async () => {
    const user = userEvent.setup();
    renderHeader('/cart');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), 'tamper');
    await user.click(within(screen.getByRole('search')).getByRole('button', { name: 'Search' }));
    expect(screen.getByLabelText('location').textContent).toBe('/shop?q=tamper');
  });

  it('starts with an empty box when opened again after a search', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox'), 'grinder{Enter}');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('marks the search button as expanded while the bar is open', async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Search' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the bar when the search button is clicked again', async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Search' });
    await user.click(toggle);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('location').textContent).toBe('/');
  });
});
