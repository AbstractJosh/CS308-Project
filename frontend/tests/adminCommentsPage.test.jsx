import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentsPage from '../src/pages/admin/CommentsPage.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { fakeAdminCommentsApi, resetFakeComments } from '../src/pages/admin/CommentsPage.fakeData.js';

function renderPage() {
  return render(
    <ToastProvider>
      <CommentsPage />
    </ToastProvider>
  );
}

async function bodyRows() {
  const table = await screen.findByRole('table');
  return within(table).getAllByRole('row').slice(1);
}

describe('Admin CommentsPage', () => {
  beforeEach(() => resetFakeComments());

  afterEach(() => vi.restoreAllMocks());

  it('shows the pending comments first, newest first', async () => {
    renderPage();
    const rows = await bodyRows();
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => within(row).getByText(/Product #/).textContent)).toEqual([
      'Product #9',
      'Product #25',
      'Product #40',
      'Product #34',
    ]);

    const first = rows[0];
    expect(within(first).getByText('Jura E6 Piano Black')).toBeInTheDocument();
    expect(within(first).getByText('Demo Customer')).toBeInTheDocument();
    expect(within(first).getByLabelText('5 out of 5')).toHaveTextContent('5 / 5');
    expect(within(first).getByText(/flat white/)).toBeInTheDocument();
    expect(within(first).getByText('17 Nov 2026')).toBeInTheDocument();
    expect(within(first).getByText('Pending')).toHaveClass('status-pill', 'status-processing');
    expect(screen.getByRole('button', { name: 'Pending' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('approves a comment and moves it under Approved', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Approve comment #12' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Comment approved');
    expect(await bodyRows()).toHaveLength(3);
    expect(screen.queryByText('Demo Customer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approved' }));
    const row = (await screen.findByText('Demo Customer')).closest('tr');
    expect(within(row).getByText('Approved')).toHaveClass('status-delivered');
  });

  it('rejects a comment and moves it under Rejected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Reject comment #10' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Comment rejected');
    expect(await bodyRows()).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    const row = (await screen.findByText('Can Demir')).closest('tr');
    expect(within(row).getByText('Rejected')).toHaveClass('status-cancelled');
    expect(await bodyRows()).toHaveLength(2);
  });

  it('offers only the other decision and lets a rejected comment be approved', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'All' }));
    await screen.findByText('Ali Çelik');

    expect(screen.getByRole('button', { name: 'Reject comment #8' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve comment #8' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve comment #6' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject comment #6' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve comment #6' }));
    expect(await screen.findByRole('button', { name: 'Reject comment #6' })).toBeInTheDocument();
    const row = screen.getByText('Ali Çelik').closest('tr');
    expect(within(row).getByText('Approved')).toHaveClass('status-delivered');
  });

  it('shows all 7 comments under All', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Demo Customer');
    await user.click(screen.getByRole('button', { name: 'All' }));
    await screen.findByText('Ali Çelik');
    expect(await bodyRows()).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('says when nothing is waiting for approval', async () => {
    vi.spyOn(fakeAdminCommentsApi, 'list').mockResolvedValueOnce({ comments: [] });
    renderPage();
    expect(await screen.findByText('No comments are waiting for approval.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No comments' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error and loads again with Try again', async () => {
    const list = vi.spyOn(fakeAdminCommentsApi, 'list').mockRejectedValueOnce(new Error('Cannot reach the server'));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Could not load the comments')).toBeInTheDocument();
    expect(screen.getByText('Cannot reach the server')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Demo Customer')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the list and shows the error when a decision fails', async () => {
    vi.spyOn(fakeAdminCommentsApi, 'decide').mockRejectedValueOnce(new Error('Cannot reach the server'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Approve comment #12' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Comment #12: Cannot reach the server');
    expect(await bodyRows()).toHaveLength(4);
    expect(screen.getByText('Demo Customer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve comment #12' })).toBeEnabled();
  });
});
