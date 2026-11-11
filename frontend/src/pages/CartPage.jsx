import { Link } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import QuantityStepper from '../components/QuantityStepper.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatPrice } from '../utils/format.js';
import { productImage } from '../utils/images.js';
import { useCart } from '../context/CartContext.jsx';
import './CartPage.css';

// Cart page, route /cart (handbook 9.6 "Cart and checkout", 9.8). Owner: Sezin (SCRUM-52).
// Works for guests and logged-in users; checkout itself needs login (handbook 7.3).
export default function CartPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  // SCRUM-71: the real cart (CartContext). A failed change (for example "Only 3 in stock") is a toast.
  const { cart, ready, updateQuantity, removeItem } = useCart();
  const showError = (err) => notify(err.message, 'error');

  if (!ready) {
    return (
      <section className="cart-page">
        <div className="container section empty-state">
          <p className="muted">Loading your cart…</p>
        </div>
      </section>
    );
  }

  return (
    <CartView
      cart={cart}
      loggedIn={Boolean(user)}
      onQuantityChange={(productId, quantity) => updateQuantity(productId, quantity).catch(showError)}
      onRemove={(productId) => removeItem(productId).catch(showError)}
    />
  );
}

// Shows a cart. Kept apart from where the cart comes from (fake now, CartContext later),
// so it can be tested with any cart.
export function CartView({ cart, loggedIn, onQuantityChange, onRemove }) {
  const { notify } = useToast();

  if (cart.items.length === 0) {
    return (
      <section className="cart-page">
        <div className="container section empty-state">
          <h3>Your cart is empty</h3>
          <p className="muted">Find a machine, a grinder or fresh coffee in the shop.</p>
          <Link to="/shop" className="btn btn-secondary">
            Back to shop
          </Link>
        </div>
      </section>
    );
  }

  // A product can sell out while it waits in a cart. It cannot be bought (req 7),
  // so checkout waits until it is removed.
  const soldOut = cart.items.filter((item) => item.product.quantityInStock <= 0);

  function handleRemove(item) {
    onRemove(item.productId);
    notify(`${item.product.name} was removed from your cart`);
  }

  return (
    <section className="cart-page">
      <div className="container">
        <header className="cart-header">
          <p className="eyebrow">Your cart</p>
          <h1 className="cart-title">
            Ready to <em>brew?</em>
          </h1>
        </header>

        <div className="cart-layout">
          {/* ----- Left: the items ----- */}
          <ul className="cart-items" aria-label="Items in your cart">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onQuantityChange={(qty) => onQuantityChange(item.productId, qty)}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </ul>

          {/* ----- Right: the summary ----- */}
          <aside className="card cart-summary" aria-label="Order summary">
            <h2 className="cart-summary-title">Summary</h2>
            <dl className="cart-summary-rows">
              <div>
                <dt>Items</dt>
                <dd>{cart.itemCount}</dd>
              </div>
              <div className="cart-summary-total">
                <dt>Subtotal</dt>
                <dd>{formatPrice(cart.subtotal)}</dd>
              </div>
            </dl>
            <p className="muted cart-summary-note">
              Delivery address and card payment come in the next step.
            </p>

            {soldOut.length > 0 ? (
              <>
                <button type="button" className="btn btn-primary cart-checkout" disabled>
                  Go to checkout
                </button>
                <p className="field-error cart-summary-note" role="alert">
                  Remove the sold-out items to continue.
                </p>
              </>
            ) : (
              // /checkout needs login: guests are sent to login and come back (SCRUM-42).
              <Link to="/checkout" className="btn btn-primary cart-checkout">
                {loggedIn ? 'Go to checkout' : 'Log in to check out'}
                <ArrowRight size={18} strokeWidth={1.5} />
              </Link>
            )}

            {!loggedIn && (
              <p className="muted cart-summary-note">
                You are shopping as a guest. Your cart is kept on this device until you log in.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function CartItemRow({ item, onQuantityChange, onRemove }) {
  const { product, quantity } = item;
  const soldOut = product.quantityInStock <= 0;

  return (
    <li className="cart-item">
      <Link to={`/products/${product.id}`} className="photo-panel cart-item-photo" tabIndex={-1}>
        <img src={productImage(product)} alt="" />
      </Link>

      <div className="cart-item-info">
        <Link to={`/products/${product.id}`} className="cart-item-name">
          {product.name}
        </Link>
        <p className="cart-item-model">{product.model}</p>
        <p className="muted cart-item-unit">{formatPrice(product.price)} each</p>

        <div className="cart-item-actions">
          {soldOut ? (
            <span className="field-error">Sold out</span>
          ) : (
            <QuantityStepper value={quantity} max={product.quantityInStock} onChange={onQuantityChange} />
          )}
          <button
            type="button"
            className="cart-item-remove"
            onClick={onRemove}
            aria-label={`Remove ${product.name}`}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Remove
          </button>
        </div>
      </div>

      <p className="cart-item-total">{formatPrice(product.price * quantity)}</p>
    </li>
  );
}
