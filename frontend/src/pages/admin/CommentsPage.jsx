import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { formatOrderDate } from '../../utils/orderDates.js';
import { fakeAdminCommentsApi as commentsAdminApi } from './CommentsPage.fakeData.js';
import './CommentsPage.css';

const FILTERS = [
  { label: 'Pending', status: 'PENDING', empty: 'No comments are waiting for approval.' },
  { label: 'Approved', status: 'APPROVED', empty: 'No approved comments yet.' },
  { label: 'Rejected', status: 'REJECTED', empty: 'No rejected comments.' },
  { label: 'All', status: undefined, empty: 'Customers have not written any comments yet.' },
];

const STATUS_PILLS = {
  PENDING: { label: 'Pending', className: 'status-processing' },
  APPROVED: { label: 'Approved', className: 'status-delivered' },
  REJECTED: { label: 'Rejected', className: 'status-cancelled' },
};

function CommentRow({ comment, deciding, onDecide }) {
  const pill = STATUS_PILLS[comment.status] ?? { label: comment.status, className: '' };

  return (
    <tr>
      <td>
        {comment.productName}
        <span className="admin-comments-sub">Product #{comment.productId}</span>
      </td>
      <td>
        {comment.customerName}
        <span className="admin-comments-sub">{formatOrderDate(comment.createdAt)}</span>
      </td>
      <td className="admin-comments-mono">
        <span aria-label={`${comment.rating} out of 5`}>{comment.rating} / 5</span>
      </td>
      <td className="admin-comments-text">{comment.comment}</td>
      <td>
        <span className={`status-pill ${pill.className}`.trim()}>{pill.label}</span>
      </td>
      <td>
        <div className="admin-comments-actions">
          {comment.status !== 'APPROVED' && (
            <button
              type="button"
              className="btn btn-secondary admin-comments-small"
              aria-label={`Approve comment #${comment.id}`}
              disabled={deciding}
              onClick={() => onDecide('APPROVED')}
            >
              Approve
            </button>
          )}
          {comment.status !== 'REJECTED' && (
            <button
              type="button"
              className="btn btn-secondary admin-comments-small"
              aria-label={`Reject comment #${comment.id}`}
              disabled={deciding}
              onClick={() => onDecide('REJECTED')}
            >
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CommentsPage() {
  const { notify } = useToast();
  const [filter, setFilter] = useState(FILTERS[0]);
  const [state, setState] = useState({ status: 'loading', comments: [], error: '' });
  const [reloadCount, setReloadCount] = useState(0);
  const [decidingId, setDecidingId] = useState(null);
  const [decideError, setDecideError] = useState('');

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    commentsAdminApi
      .list(filter.status)
      .then((data) => active && setState({ status: 'ready', comments: data.comments ?? [], error: '' }))
      .catch((err) => active && setState({ status: 'error', comments: [], error: err.message }));
    return () => {
      active = false;
    };
  }, [filter, reloadCount]);

  function chooseFilter(option) {
    setFilter(option);
    setDecideError('');
  }

  async function decide(comment, status) {
    setDecidingId(comment.id);
    setDecideError('');
    try {
      await commentsAdminApi.decide(comment.id, status);
      notify(status === 'APPROVED' ? 'Comment approved' : 'Comment rejected');
      setReloadCount((n) => n + 1);
    } catch (err) {
      setDecideError(`Comment #${comment.id}: ${err.message}`);
    } finally {
      setDecidingId(null);
    }
  }

  const ready = state.status === 'ready';

  return (
    <div className="admin-comments-page">
      <p className="eyebrow">Reviews</p>
      <h2>
        Comment <em>approval</em>
      </h2>

      <div className="admin-comments-filters" role="group" aria-label="Show comments">
        {FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`admin-comments-filter${option === filter ? ' active' : ''}`}
            aria-pressed={option === filter}
            onClick={() => chooseFilter(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {decideError && (
        <p className="field-error admin-comments-alert" role="alert">
          {decideError}
        </p>
      )}

      {state.status === 'loading' && <p className="muted">Loading comments…</p>}

      {state.status === 'error' && (
        <div className="empty-state admin-comments-message">
          <h3>Could not load the comments</h3>
          <p className="muted">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {ready && state.comments.length === 0 && (
        <div className="empty-state admin-comments-message">
          <h3>No comments</h3>
          <p className="muted">{filter.empty}</p>
        </div>
      )}

      {ready && state.comments.length > 0 && (
        <div className="admin-comments-table-wrap">
          <table className="admin-comments-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Customer</th>
                <th scope="col">Rating</th>
                <th scope="col">Comment</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  deciding={decidingId === comment.id}
                  onDecide={(status) => decide(comment, status)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
