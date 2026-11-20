import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { CartProvider } from '../src/context/CartContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, cartApi, checkoutApi, productsApi } from '../src/api/endpoints.js';
import { addGuestItem, buildCart } from '../src/utils/cartStorage.js';

// SCRUM-55: the whole buying flow of the progress demo (req 1, 3, 4) in one test, across pages:
// product page -> add to cart as a guest -> cart -> log in -> checkout -> pay -> confirmation.
// The real pages and providers run in the same order as main.jsx; only the API calls are mocked.
const HOME = 'Sabancı University, Orta Mahalle, Tuzla, İstanbul';
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER', homeAddress: HOME };
const grinder = {
  id: 40,
  name: 'Zassenhaus Manaos Hand Grinder',
  model: 'Manaos',
  serialNumber: 'CRM-GR-8004',
  description: 'Manual coffee grinder with a hand crank.',
  quantityInStock: 14,
  price: 4199,
  warrantyStatus: 'No warranty',
  distributor: 'Zassenhaus official distributor',
  imageCount: 4,
  popularity: 77,
  categoryId: 8,
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  inStock: true,
  category: { id: 8, name: 'Grinders', slug: 'grinders' },
};

function renderSite(start) {
  return render(
    <MemoryRouter initialEntries={[start]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const cartCount = () => screen.queryByTestId('cart-count');

afterEach(() => vi.restoreAllMocks());

describe('buying flow from product page to confirmation', () => {
  it('lets a guest add a product, log in at checkout, pay and see the confirmation', async () => {
    vi.spyOn(productsApi, 'get').mockResolvedValue({ product: grinder });
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({ user: customer, token: 'new-token' });
    // At login the guest cart is moved to the account (POST /cart/merge).
    const merge = vi.spyOn(cartApi, 'merge').mockResolvedValueOnce({ cart: buildCart(addGuestItem([], grinder, 1)) });
    const create = vi.spyOn(checkoutApi, 'create').mockResolvedValueOnce({
      order: {
        id: 12,
        status: 'PROCESSING',
        total: 4199,
        deliveryAddress: HOME,
        cardLast4: '4242',
        createdAt: '2026-11-20T10:00:00.000Z',
        deliveredAt: null,
        items: [{ id: 1, productId: 40, name: grinder.name, model: grinder.model, quantity: 1, unitPrice: 4199 }],
      },
      invoice: { id: 12, invoiceNumber: 'INV-000012' },
      emailSent: true,
    });
    // After paying, the server's cart is empty; the page asks and the header count goes away.
    vi.spyOn(cartApi, 'removeItem').mockResolvedValue({ cart: buildCart([]) });
    const user = userEvent.setup();
    renderSite('/products/40');

    // 1. Product page: add to cart as a guest. The header shows 1 item.
    await user.click(await screen.findByRole('button', { name: /add to cart/i }));
    await waitFor(() => expect(cartCount()).toHaveTextContent('1'));

    // 2. Cart page through the header link.
    await user.click(screen.getByRole('link', { name: 'Cart' }));
    expect(await screen.findByRole('link', { name: grinder.name })).toBeInTheDocument();

    // 3. Checkout needs login (req 4): log in, the guest cart is merged, back to checkout.
    await user.click(screen.getByRole('link', { name: /log in to check out/i }));
    await user.type(await screen.findByLabelText('Email'), 'customer@crema.com');
    await user.type(screen.getByLabelText('Password'), 'Demo1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByLabelText('Deliver to')).toHaveValue(HOME);
    expect(merge).toHaveBeenCalledWith([{ productId: 40, quantity: 1 }]);

    // 4. Pay with the approved test card.
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await user.type(screen.getByLabelText('Name on card'), 'Demo Customer');
    await user.type(screen.getByLabelText('Card number'), '4242 4242 4242 4242');
    await user.type(screen.getByLabelText('Expiry (MM/YY)'), '1129');
    await user.type(screen.getByLabelText('CVV'), '123');
    await user.click(screen.getByRole('button', { name: /^pay /i }));

    // 5. Confirmation (req 3): order placed and processing, invoice ready; the cart is empty.
    expect(await screen.findByRole('heading', { name: /thank you, your order is placed/i })).toBeInTheDocument();
    expect(screen.getByText('INV-000012')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Items you bought' })).getByText(grinder.name)).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({
      deliveryAddress: HOME,
      card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 11, expiryYear: 2029, cvv: '123' },
    });
    await waitFor(() => expect(cartCount()).not.toBeInTheDocument());
  });
});
