import { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import WishlistButton from '../src/components/WishlistButton.jsx';
import WishlistPage from '../src/pages/WishlistPage.jsx';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, wishlistApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

// SCRUM-86: the heart button on the product page and the wishlist page, on Ulukan's wishlist API.
// The API calls are mocked (every call answers { products }); no backend is needed.
const routerFlags = { v7_startTransition: true, v7_relativeSplatPath: true };
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' };
const product = (id, name, price) => ({
  id,
  name,
  model: 'Model',
  serialNumber: `CRM-XX-${id}`,
  description: 'A product.',
  quantityInStock: 5,
  price,
  warrantyStatus: 'No warranty',
  distributor: 'Crema official distributor',
  imageCount: 1,
  popularity: 10,
  categoryId: 1,
  inStock: true,
  category: { id: 1, name: 'Grinders', slug: 'grinders' },
});
const machine = product(3, 'Sage The Barista Express Impress', 99999);
const grinder = product(40, 'Zassenhaus Manaos Hand Grinder', 4199);
const apiError = (status, message) => Object.assign(new Error(message), { status });

function logIn(user = customer) {
  tokenStore.set('saved-token');
  vi.spyOn(authApi, 'me').mockResolvedValue({ user });
}

// Shows the current address, so a test can see where the page sent the user.
function Address() {
  const { pathname, search } = useLocation();
  useEffect(() => {}, [pathname]);
  return <p data-testid="address">{`${pathname}${search}`}</p>;
}

// Shows who is logged in once the saved token has been checked.
function WhoIsLoggedIn() {
  const { user, loading } = useAuth();
  return <p data-testid="who">{loading ? 'checking' : user?.role ?? 'guest'}</p>;
}

function renderButton() {
  return render(
    <MemoryRouter initialEntries={['/products/3']} future={routerFlags}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="*" element={<WishlistButton product={machine} />} />
          </Routes>
          <Address />
          <WhoIsLoggedIn />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/wishlist']} future={routerFlags}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/wishlist" element={<WishlistPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('WishlistButton (product page)', () => {
  it('sends a guest to log in and back to this product', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(await screen.findByRole('button', { name: 'Save to wishlist' }));
    expect(screen.getByTestId('address')).toHaveTextContent('/login?redirect=%2Fproducts%2F3');
  });

  it('is not shown to staff, who have no wishlist', async () => {
    logIn({ ...customer, role: 'SALES_MANAGER' });
    renderButton();
    expect(await screen.findByText('SALES_MANAGER')).toBeInTheDocument(); // the login check is done
    expect(screen.queryByRole('button', { name: /wishlist/i })).not.toBeInTheDocument();
  });

  it('saves the product, fills the heart and links to the wishlist', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list').mockResolvedValue({ products: [grinder] });
    const add = vi.spyOn(wishlistApi, 'add').mockResolvedValue({ products: [grinder, machine] });
    const user = userEvent.setup();
    renderButton();

    const heart = await screen.findByRole('button', { name: 'Save to wishlist', pressed: false });
    await user.click(heart);
    expect(add).toHaveBeenCalledWith(3);
    expect(await screen.findByRole('button', { name: 'Remove from wishlist', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved to your wishlist');
    expect(screen.getByRole('link', { name: 'View wishlist' })).toHaveAttribute('href', '/wishlist');
  });

  it('removes a saved product', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list').mockResolvedValue({ products: [machine] });
    const remove = vi.spyOn(wishlistApi, 'remove').mockResolvedValue({ products: [] });
    const user = userEvent.setup();
    renderButton();

    await user.click(await screen.findByRole('button', { name: 'Remove from wishlist', pressed: true }));
    expect(remove).toHaveBeenCalledWith(3);
    expect(await screen.findByRole('button', { name: 'Save to wishlist', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Removed from your wishlist');
  });

  it('keeps the heart as it was and shows the reason when the API fails', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list').mockResolvedValue({ products: [] });
    vi.spyOn(wishlistApi, 'add').mockRejectedValue(apiError(404, 'Product not found'));
    const user = userEvent.setup();
    renderButton();

    await user.click(await screen.findByRole('button', { name: 'Save to wishlist' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Product not found');
    expect(screen.getByRole('button', { name: 'Save to wishlist', pressed: false })).toBeEnabled();
  });
});

describe('WishlistPage', () => {
  it('shows the saved products as cards with the count', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list').mockResolvedValue({ products: [machine, grinder] });
    renderPage();
    const list = await screen.findByRole('list', { name: 'Saved products' });
    expect(within(list).getByRole('link', { name: machine.name })).toHaveAttribute('href', '/products/3');
    expect(within(list).getByRole('link', { name: grinder.name })).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
  });

  it('removes a product, and shows the empty wishlist after the last one', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list').mockResolvedValue({ products: [machine, grinder] });
    vi.spyOn(wishlistApi, 'remove')
      .mockResolvedValueOnce({ products: [grinder] })
      .mockResolvedValueOnce({ products: [] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: `Remove ${machine.name} from wishlist` }));
    expect(await screen.findByText('1 product')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: machine.name })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(`${machine.name} was removed from your wishlist`);

    await user.click(screen.getByRole('button', { name: `Remove ${grinder.name} from wishlist` }));
    expect(await screen.findByText('Your wishlist is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('tells staff that the wishlist is only for customers', async () => {
    logIn({ ...customer, role: 'PRODUCT_MANAGER' });
    vi.spyOn(wishlistApi, 'list').mockRejectedValue(apiError(403, 'Forbidden'));
    renderPage();
    expect(await screen.findByText('Only for customers')).toBeInTheDocument();
  });

  it('shows the error and loads again on "Try again"', async () => {
    logIn();
    vi.spyOn(wishlistApi, 'list')
      .mockRejectedValueOnce(apiError(0, 'Cannot reach the server. Is the backend running?'))
      .mockResolvedValueOnce({ products: [grinder] });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Could not load your wishlist')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: grinder.name })).toBeInTheDocument();
  });

  it('sends a guest who opens /wishlist to log in first', async () => {
    render(
      <MemoryRouter initialEntries={['/wishlist']} future={routerFlags}>
        <ToastProvider>
          <AuthProvider>
            <App />
            <Address />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('address')).toHaveTextContent('/login?redirect=%2Fwishlist');
  });
});
