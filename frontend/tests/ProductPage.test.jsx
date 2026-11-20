import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductPage from '../src/pages/ProductPage.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { productsApi } from '../src/api/endpoints.js';

// Test product in the Product shape of handbook 8.1 (CRM-EM-1003 from Appendix A).
// The API is mocked below, so no backend or database is needed.
const product = {
  id: 3,
  name: 'Sage The Barista Express Impress',
  model: 'SES876 BSS',
  serialNumber: 'CRM-EM-1003',
  description: 'Espresso machine with a built-in grinder and assisted tamping.',
  quantityInStock: 9,
  price: 99999,
  warrantyStatus: '2 years manufacturer warranty',
  distributor: 'Sage official distributor',
  imageCount: 8,
  popularity: 188,
  categoryId: 1,
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  inStock: true,
  category: { id: 1, name: 'Espresso Machines', slug: 'espresso-machines' },
};
const soldOutProduct = { ...product, quantityInStock: 0, inStock: false };

// An error like the one api() in client.js throws.
function apiError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Renders the product page at /products/<id>, with the toast provider it needs.
function renderProduct(id = product.id) {
  return render(
    <MemoryRouter
      initialEntries={[`/products/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path="/products/:id" element={<ProductPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

const addButton = () => screen.getByRole('button', { name: /add to cart/i });

afterEach(() => vi.restoreAllMocks());

describe('ProductPage', () => {
  it('loads the product by the id in the URL', async () => {
    const get = vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product });
    renderProduct(3);
    expect(screen.getByText('Loading product')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(product.name);
    expect(get).toHaveBeenCalledWith('3');
  });

  it('shows every requirement 9 field', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product });
    renderProduct();
    const specs = (await screen.findByText('Serial number')).closest('dl');
    const spec = (label) => within(specs).getByText(label).nextElementSibling;

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(product.name);
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText('₺99,999.00')).toBeInTheDocument();
    expect(spec('Product ID')).toHaveTextContent('3');
    expect(spec('Serial number')).toHaveTextContent('CRM-EM-1003');
    expect(spec('Model')).toHaveTextContent('SES876 BSS');
    expect(spec('Warranty')).toHaveTextContent('2 years manufacturer warranty');
    expect(spec('Distributor')).toHaveTextContent('Sage official distributor');
    expect(spec('Stock')).toHaveTextContent('9 units');
    expect(screen.getByText('9 in stock')).toBeInTheDocument();
    expect(screen.getByText('Espresso Machines')).toBeInTheDocument();
    expect(screen.getByText('BEST SELLER')).toBeInTheDocument();
  });

  it('shows one thumbnail per photo and switches the big photo', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderProduct();
    await user.click(await screen.findByRole('button', { name: 'Show photo 3' }));
    expect(screen.getAllByRole('button', { name: /show photo/i })).toHaveLength(8);
    expect(screen.getByAltText(`${product.name}, photo 3`)).toHaveAttribute(
      'src',
      '/images/products/CRM-EM-1003/03.jpg'
    );
  });

  it('lets the quantity go up to the stock only', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderProduct();
    const plus = await screen.findByRole('button', { name: 'Increase quantity' });
    for (let i = 0; i < 12; i += 1) await user.click(plus);
    expect(screen.getByLabelText('Quantity')).toHaveTextContent('9');
  });

  it('shows a toast when Add to cart is clicked', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderProduct();
    await user.click(await screen.findByRole('button', { name: 'Increase quantity' }));
    expect(addButton()).toBeEnabled();
    await user.click(addButton());
    expect(await screen.findByRole('status')).toHaveTextContent(`Added 2 × ${product.name} to your cart`);
  });

  it('disables Add to cart when the stock is 0 and says it can still be found in search', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValueOnce({ product: soldOutProduct });
    const user = userEvent.setup();
    renderProduct();
    expect(await screen.findByText('Sold out')).toBeInTheDocument();
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(screen.getByText(/still find it in search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
    await user.click(addButton());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows "Product not found" when the API answers 404', async () => {
    vi.spyOn(productsApi, 'get').mockRejectedValueOnce(apiError(404, 'Product not found'));
    renderProduct(12345);
    expect(await screen.findByText('Product not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop');
  });

  it('shows the error and loads again on "Try again" when the server is down', async () => {
    vi.spyOn(productsApi, 'get')
      .mockRejectedValueOnce(apiError(0, 'Cannot reach the server. Is the backend running?'))
      .mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderProduct();
    expect(await screen.findByText('Could not load this product')).toBeInTheDocument();
    expect(screen.getByText('Cannot reach the server. Is the backend running?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(product.name);
  });
});
