import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, useNavigate } from 'react-router-dom';
import ScrollToTop from '../src/components/ScrollToTop.jsx';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';

vi.mock('../src/api/endpoints.js', async () => {
  const fake = await import('./fixtures/fakeCatalog.js');
  return {
    ...fake,
    productsApi: {
      ...fake.productsApi,
      get: async (id) => {
        const { products } = await fake.productsApi.list();
        return { product: products.find((product) => String(product.id) === String(id)) };
      },
    },
  };
});

function TestPage() {
  const navigate = useNavigate();
  return (
    <nav>
      <Link to="/shop">Shop</Link>
      <Link to="/shop?sort=price_desc">Sort by price</Link>
      <Link to="/cart">Cart</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </nav>
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <TestPage />
    </MemoryRouter>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('does not scroll on the first render', () => {
    renderAt('/');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top when a link opens another path', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Shop' }));
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll when only the query string changes', async () => {
    const user = userEvent.setup();
    renderAt('/shop');
    await user.click(screen.getByRole('link', { name: 'Sort by price' }));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls again on each new path', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Shop' }));
    await user.click(screen.getByRole('link', { name: 'Cart' }));
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it('does not scroll when going back', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Cart' }));
    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top when a product is opened from the shop', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/shop']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
    await screen.findByText('51 PRODUCTS');
    expect(window.scrollTo).not.toHaveBeenCalled();
    const firstCard = screen.getAllByRole('article')[0];
    const heading = within(firstCard).getByRole('heading', { level: 3 });
    await user.click(within(heading).getByRole('link'));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
