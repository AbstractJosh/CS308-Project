import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProductReviews from '../src/components/ProductReviews.jsx';
import { StarRating } from '../src/components/StarRating.jsx';
import { resetFakeReviews } from '../src/components/ProductReviews.fakeData.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { authApi, ordersApi } from '../src/api/endpoints.js';
import { tokenStore } from '../src/api/client.js';

// SCRUM-85: ratings and comments on the product page (req 5, handbook 7.7), on fake reviews data.
// Who is logged in (GET /auth/me) and their orders (GET /orders) are mocked; no backend is needed.
// Product 3 starts with four ratings (5, 4, 4, 5): two approved comments, one rating without a
// comment and one comment still waiting for approval.
const machine = { id: 3, name: 'Sage The Barista Express Impress' };
const customer = { id: 1, name: 'Demo Customer', email: 'customer@crema.com', role: 'CUSTOMER' };
const deliveredOrder = { id: 7, status: 'DELIVERED', items: [{ id: 1, productId: 3, quantity: 1 }] };

function renderReviews({ user = null, orders = [] } = {}) {
  if (user) {
    tokenStore.set('saved-token');
    vi.spyOn(authApi, 'me').mockResolvedValue({ user });
    vi.spyOn(ordersApi, 'list').mockResolvedValue({ orders });
  }
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <ProductReviews product={machine} />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const summary = () => screen.getByRole('complementary', { name: 'Rating summary' });

afterEach(() => {
  vi.restoreAllMocks();
  resetFakeReviews();
});

describe('ProductReviews', () => {
  it('shows the average of every rating and only the approved comments', async () => {
    renderReviews();
    expect(await screen.findByText('4.5')).toBeInTheDocument(); // (5 + 4 + 4 + 5) / 4
    expect(within(summary()).getByText('Based on 4 ratings')).toBeInTheDocument();
    const comments = screen.getByRole('list', { name: 'Comments' });
    expect(within(comments).getAllByRole('listitem')).toHaveLength(2);
    expect(within(comments).getByText(/assisted tamping really helps/)).toBeInTheDocument();
    expect(screen.queryByText('Looks lovely on the counter too.')).not.toBeInTheDocument(); // pending
  });

  it('asks a guest to log in, and comes back to this product after', async () => {
    renderReviews();
    const link = await screen.findByRole('link', { name: 'Log in' });
    expect(link).toHaveAttribute('href', '/login?redirect=%2Fproducts%2F3');
    expect(screen.queryByRole('button', { name: 'Send review' })).not.toBeInTheDocument();
  });

  it('does not let a customer review a product that was not delivered to them', async () => {
    const notYet = { id: 8, status: 'IN_TRANSIT', items: [{ id: 2, productId: 3, quantity: 1 }] };
    renderReviews({ user: customer, orders: [notYet] });
    expect(await screen.findByText(/once an order with it has been delivered/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send review' })).not.toBeInTheDocument();
  });

  it('does not show the form to staff', async () => {
    renderReviews({ user: { ...customer, role: 'PRODUCT_MANAGER' } });
    expect(await screen.findByText('Only customers can rate products.')).toBeInTheDocument();
  });

  it('needs a rating, and keeps comments to 1000 characters', async () => {
    const user = userEvent.setup();
    renderReviews({ user: customer, orders: [deliveredOrder] });
    await user.click(await screen.findByRole('button', { name: 'Send review' }));
    expect(screen.getByText('Choose a rating from 1 to 5 stars')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByLabelText('Comment (optional)'));
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Send review' }));
    expect(screen.getByText('Comments can be at most 1000 characters')).toBeInTheDocument();
    expect(screen.queryByText('Your review')).not.toBeInTheDocument();
  });

  it('counts a delivered customer\'s rating at once and holds the comment for approval', async () => {
    const user = userEvent.setup();
    renderReviews({ user: customer, orders: [deliveredOrder] });
    await user.click(await screen.findByRole('radio', { name: '3 stars' }));
    await user.type(screen.getByLabelText('Comment (optional)'), 'Good, but loud in the morning.');
    await user.click(screen.getByRole('button', { name: 'Send review' }));

    expect(await screen.findByText('Your review')).toBeInTheDocument();
    expect(within(summary()).getByText('4.2')).toBeInTheDocument(); // (18 + 3) / 5
    expect(within(summary()).getByText('Based on 5 ratings')).toBeInTheDocument();
    expect(screen.getByText(/waiting for a product manager to approve it/)).toBeInTheDocument();
    expect(screen.queryByText('Good, but loud in the morning.')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('your comment will appear after approval');
    expect(screen.queryByRole('button', { name: 'Send review' })).not.toBeInTheDocument(); // only once
  });

  it('accepts a rating without a comment', async () => {
    const user = userEvent.setup();
    renderReviews({ user: customer, orders: [deliveredOrder] });
    await user.click(await screen.findByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Send review' }));
    expect(await screen.findByText('Your review')).toBeInTheDocument();
    expect(screen.queryByText(/waiting for a product manager/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Thanks! Your rating is live.');
  });
});

describe('StarRating', () => {
  it('reads the rating out and fills half a star for 4.5', () => {
    const { container } = render(<StarRating value={4.5} />);
    expect(screen.getByRole('img', { name: 'Rated 4.5 out of 5' })).toBeInTheDocument();
    const fills = [...container.querySelectorAll('.star-rating-fill')].map((el) => el.style.width);
    expect(fills).toEqual(['100%', '100%', '100%', '100%', '50%']);
  });
});
