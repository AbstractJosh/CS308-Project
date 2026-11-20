import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../src/components/ProductCard.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';

const product = {
  id: 7,
  name: 'Sage The Bambino Plus',
  model: 'SES500 BSS',
  serialNumber: 'CRM-EM-1005',
  quantityInStock: 12,
  price: 49999,
  distributor: 'Sage official distributor',
  popularity: 152,
  inStock: true,
};

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <ProductCard product={{ ...product, ...overrides }} />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  it('shows the product details and links to the product page', () => {
    renderCard();
    expect(screen.getByRole('link', { name: product.name })).toHaveAttribute('href', '/products/7');
    expect(screen.getByText('Sage · SES500 BSS')).toBeInTheDocument();
    expect(screen.getByText('₺49,999.00')).toBeInTheDocument();
    expect(screen.getByText('12 in stock')).toBeInTheDocument();
    expect(screen.getByText('BEST SELLER')).toBeInTheDocument();
  });

  it('uses the first product photo', () => {
    renderCard();
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute(
      'src',
      '/images/products/CRM-EM-1005/01.jpg'
    );
  });

  it('disables the add button when the product is sold out', () => {
    renderCard({ quantityInStock: 0, inStock: false });
    expect(screen.getByRole('button', { name: `Add ${product.name} to cart` })).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
  });

  it('adds one to the cart with a toast when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: `Add ${product.name} to cart` }));
    expect(await screen.findByRole('status')).toHaveTextContent(`Added 1 × ${product.name} to your cart`);
  });
});
