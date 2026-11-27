import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import FormField from './FormField.jsx';
import { StarInput, StarRating } from './StarRating.jsx';
import { ordersApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatOrderDate } from '../utils/orderDates.js';
import { fakeReviewsApi } from './ProductReviews.fakeData.js';
import './ProductReviews.css';

// Ratings and comments on the product page (req 5, handbook 7.7). Owner: Sezin (SCRUM-85).
// - Everyone sees the average rating and the approved comments.
// - Only a customer who has this product in a DELIVERED order can review it, once.
// - The rating counts at once; the comment waits until a product manager approves it.
// The backend checks all of this again; the page only shows the right thing.
const COMMENT_MAX = 1000;

// TODO(SCRUM-87): use the real reviews API (GET and POST /products/:id/reviews) instead.
const reviewsApi = fakeReviewsApi;

export default function ProductReviews({ product }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');
  // Can this user review? 'checking', 'guest', 'staff', 'not-delivered' or 'can-review'.
  const [eligibility, setEligibility] = useState('checking');

  useEffect(() => {
    let stale = false;
    reviewsApi
      .list(product.id)
      .then((answer) => !stale && setData(answer))
      .catch((err) => !stale && setFailed(err.message));
    return () => {
      stale = true;
    };
  }, [product.id]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setEligibility('guest');
      return undefined;
    }
    if (user.role !== 'CUSTOMER') {
      setEligibility('staff');
      return undefined;
    }
    // A delivered order with this product makes the customer a buyer (handbook 7.7).
    let stale = false;
    setEligibility('checking');
    ordersApi
      .list()
      .then(({ orders }) => {
        if (stale) return;
        const delivered = orders.some(
          (order) => order.status === 'DELIVERED' && order.items.some((item) => item.productId === product.id)
        );
        setEligibility(delivered ? 'can-review' : 'not-delivered');
      })
      .catch(() => !stale && setEligibility('not-delivered'));
    return () => {
      stale = true;
    };
  }, [user, authLoading, product.id]);

  function handleReviewed(review) {
    // The new rating counts in the average at once; the comment is not listed until approved.
    setData((current) => {
      const ratingCount = current.ratingCount + 1;
      const total = current.averageRating * current.ratingCount + review.rating;
      return {
        ...current,
        ratingCount,
        averageRating: Math.round((total / ratingCount) * 10) / 10,
        myReview: review,
      };
    });
  }

  return (
    <section className="product-reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="container">
        <p className="eyebrow">Reviews</p>
        <h2 id="reviews-title" className="product-reviews-title">
          What customers <em>say</em>
        </h2>

        {failed && (
          <p className="field-error" role="alert">
            Could not load the reviews: {failed}
          </p>
        )}
        {!data && !failed && <p className="muted">Loading reviews…</p>}

        {data && (
          <div className="product-reviews-layout">
            <aside className="card product-reviews-summary" aria-label="Rating summary">
              <p className="product-reviews-average">{data.ratingCount ? data.averageRating.toFixed(1) : '–'}</p>
              <StarRating value={data.averageRating} size={20} />
              <p className="muted product-reviews-count">
                {data.ratingCount === 0
                  ? 'No ratings yet'
                  : `Based on ${data.ratingCount} rating${data.ratingCount === 1 ? '' : 's'}`}
              </p>

              <div className="product-reviews-action">
                <ReviewAction
                  product={product}
                  eligibility={eligibility}
                  myReview={data.myReview}
                  customerName={user?.name}
                  onReviewed={handleReviewed}
                />
              </div>
            </aside>

            <div className="product-reviews-list-wrap">
              {data.reviews.length === 0 ? (
                <p className="muted product-reviews-empty">
                  <MessageSquare size={20} strokeWidth={1.5} /> No comments yet.
                </p>
              ) : (
                <ul className="product-reviews-list" aria-label="Comments">
                  {data.reviews.map((review) => (
                    <li key={review.id} className="product-review">
                      <div className="product-review-head">
                        <StarRating value={review.rating} size={16} />
                        <span className="product-review-name">{review.customerName}</span>
                        <span className="muted">{formatOrderDate(review.createdAt)}</span>
                      </div>
                      <p className="product-review-text">{review.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// What the box under the average shows: the form, the user's own review, or why they cannot review.
function ReviewAction({ product, eligibility, myReview, customerName, onReviewed }) {
  if (myReview) return <MyReview review={myReview} />;
  if (eligibility === 'checking') return <p className="muted">Checking whether you can review…</p>;
  if (eligibility === 'guest') {
    return (
      <p className="muted">
        <Link to={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`} className="text-link">
          Log in
        </Link>{' '}
        to rate a product you bought.
      </p>
    );
  }
  if (eligibility === 'staff') return <p className="muted">Only customers can rate products.</p>;
  if (eligibility === 'not-delivered') {
    return <p className="muted">You can rate this product once an order with it has been delivered to you.</p>;
  }
  return <ReviewForm product={product} customerName={customerName} onReviewed={onReviewed} />;
}

function MyReview({ review }) {
  return (
    <div className="product-reviews-mine">
      <p className="product-reviews-mine-label">Your review</p>
      <StarRating value={review.rating} size={18} />
      <p className="muted">Your rating counts in the average.</p>
      {review.comment && review.status === 'PENDING' && (
        <p className="muted">Your comment is waiting for a product manager to approve it.</p>
      )}
      {review.comment && review.status === 'REJECTED' && (
        <p className="muted">Your comment was not approved, so it is not shown.</p>
      )}
    </div>
  );
}

function ReviewForm({ product, customerName, onReviewed }) {
  const { notify } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sending, setSending] = useState(false);

  const errors = {};
  if (submitted && !rating) errors.rating = 'Choose a rating from 1 to 5 stars';
  if (comment.length > COMMENT_MAX) errors.comment = `Comments can be at most ${COMMENT_MAX} characters`;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (!rating || comment.length > COMMENT_MAX) return;
    setSending(true);
    setApiError('');
    try {
      const { review } = await reviewsApi.create(product.id, { rating, comment }, customerName);
      onReviewed(review);
      notify(review.comment ? 'Thanks! Your rating is live; your comment will appear after approval.' : 'Thanks! Your rating is live.');
    } catch (err) {
      setApiError(err.message);
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="product-reviews-form">
      <StarInput value={rating} onChange={setRating} error={errors.rating} />
      <FormField
        id="comment"
        label="Comment (optional)"
        as="textarea"
        rows={4}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        error={errors.comment}
        hint={`${comment.length}/${COMMENT_MAX}. A product manager checks comments before they appear.`}
      />
      {apiError && (
        <p className="field-error" role="alert">
          {apiError}
        </p>
      )}
      <button type="submit" className="btn btn-primary product-reviews-submit" disabled={sending}>
        {sending ? 'Sending…' : 'Send review'}
      </button>
    </form>
  );
}
