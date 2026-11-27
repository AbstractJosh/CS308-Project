import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { wishlistApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import './WishlistButton.css';

// Heart button on the product page: save or remove the product from the wishlist (SCRUM-86).
// Owner: Sezin. The wishlist is only for customers (docs/API.md: staff get 403):
// guests are sent to log in first, staff do not see the button.
export default function WishlistButton({ product }) {
  const { user, loading } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const isCustomer = user?.role === 'CUSTOMER';
  // null while we do not know yet whether this product is in the wishlist.
  const [saved, setSaved] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isCustomer) return undefined;
    let stale = false;
    wishlistApi
      .list()
      .then(({ products }) => !stale && setSaved(products.some((p) => p.id === product.id)))
      .catch(() => !stale && setSaved(false));
    return () => {
      stale = true;
    };
  }, [isCustomer, product.id]);

  if (loading || (user && !isCustomer)) return null;

  async function handleClick() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }
    setSending(true);
    try {
      // Every call answers the whole wishlist, so the button reads its state from the answer.
      const { products } = saved ? await wishlistApi.remove(product.id) : await wishlistApi.add(product.id);
      const nowSaved = products.some((p) => p.id === product.id);
      setSaved(nowSaved);
      notify(nowSaved ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wishlist-button-wrap">
      <button
        type="button"
        className={`wishlist-button${saved ? ' wishlist-button-on' : ''}`}
        aria-pressed={user ? Boolean(saved) : undefined}
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        disabled={sending || (user && saved === null)}
        onClick={handleClick}
      >
        <Heart size={20} strokeWidth={1.5} />
      </button>
      {saved && (
        <Link to="/wishlist" className="text-link wishlist-button-link">
          View wishlist
        </Link>
      )}
    </div>
  );
}
