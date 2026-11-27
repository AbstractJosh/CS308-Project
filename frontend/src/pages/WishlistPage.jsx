import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { wishlistApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import './WishlistPage.css';

// Wishlist page, route /wishlist, only for logged-in users (handbook 9.8). Owner: Sezin (SCRUM-86).
// Shows the products the customer saved with the heart on the product page (Ulukan's wishlist API).
// Later the sales manager's discounts notify the customers who saved a product (req 11, Sprint 4).
export default function WishlistPage() {
  const { notify } = useToast();
  // 'loading', 'ready', 'staff' (403: the wishlist is only for customers) or 'error'.
  const [status, setStatus] = useState('loading');
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    wishlistApi
      .list()
      .then((answer) => {
        if (stale) return;
        setProducts(answer.products);
        setStatus('ready');
      })
      .catch((err) => {
        if (stale) return;
        setError(err.message);
        setStatus(err.status === 403 ? 'staff' : 'error');
      });
    return () => {
      stale = true;
    };
  }, [attempt]);

  async function handleRemove(product) {
    setRemoving(product.id);
    try {
      // The API answers the whole wishlist, so the page just shows that.
      const answer = await wishlistApi.remove(product.id);
      setProducts(answer.products);
      notify(`${product.name} was removed from your wishlist`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setRemoving(null);
    }
  }

  if (status === 'loading') {
    return <PageMessage title="Loading your wishlist" text="One moment." />;
  }
  if (status === 'staff') {
    return <PageMessage title="Only for customers" text="Staff accounts do not have a wishlist." />;
  }
  if (status === 'error') {
    return (
      <PageMessage title="Could not load your wishlist" text={error}>
        <button type="button" className="btn btn-secondary" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </PageMessage>
    );
  }
  if (products.length === 0) {
    return (
      <PageMessage
        title="Your wishlist is empty"
        text="Tap the heart on a product to save it here for later."
      >
        <Link to="/shop" className="btn btn-secondary">
          Back to shop
        </Link>
      </PageMessage>
    );
  }

  return (
    <section className="wishlist-page">
      <div className="container">
        <header className="wishlist-header">
          <div>
            <p className="eyebrow">Your wishlist</p>
            <h1 className="wishlist-title">
              Saved for <em>later.</em>
            </h1>
          </div>
          <p className="wishlist-count">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </header>

        <ul className="wishlist-grid" aria-label="Saved products">
          {products.map((product) => (
            <li key={product.id} className="wishlist-item">
              <ProductCard product={product} />
              <button
                type="button"
                className="wishlist-remove"
                onClick={() => handleRemove(product)}
                disabled={removing === product.id}
                aria-label={`Remove ${product.name} from wishlist`}
              >
                <Trash2 size={16} strokeWidth={1.5} />
                {removing === product.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Empty, loading and error states (handbook 9.6): H3 title, one muted sentence, a button.
function PageMessage({ title, text, children }) {
  return (
    <section className="wishlist-page">
      <div className="container section empty-state" aria-live="polite">
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        {children}
      </div>
    </section>
  );
}
