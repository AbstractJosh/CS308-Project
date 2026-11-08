import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import ProductBadge from '../components/ProductBadge.jsx';
import QuantityStepper, { clampQuantity } from '../components/QuantityStepper.jsx';
import { productsApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatPrice, stockLabel } from '../utils/format.js';
import { productImage } from '../utils/images.js';
import './ProductPage.css';

// Product page, route /products/:id (handbook 9.6). Owner: Sezin (SCRUM-16).
// Loads the product from GET /api/products/:id and shows every requirement 9 field
// and the stock count (req 3, 9).
export default function ProductPage() {
  const { id } = useParams();
  // One object for the whole request, so the page never shows an old product with a new id.
  const [state, setState] = useState({ id, status: 'loading', product: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // stale: the user moved to another product before this answer came back; ignore it.
    let stale = false;
    setState({ id, status: 'loading', product: null, error: '' });
    productsApi
      .get(id)
      .then(({ product }) => {
        if (!stale) setState({ id, status: 'ready', product, error: '' });
      })
      .catch((err) => {
        if (stale) return;
        // 404 = no such product, 400 = the id is not a number. Both mean "not found" here.
        const notFound = err.status === 404 || err.status === 400;
        setState({ id, status: notFound ? 'not-found' : 'error', product: null, error: err.message });
      });
    return () => {
      stale = true;
    };
  }, [id, attempt]);

  // Right after the id changes, the effect has not run yet: show loading, not the old product.
  const status = state.id === id ? state.status : 'loading';

  if (status === 'loading') {
    return (
      <PageMessage title="Loading product" text="One moment, the product is on its way." />
    );
  }

  if (status === 'not-found') {
    return (
      <PageMessage title="Product not found" text="This product does not exist or is no longer sold.">
        <Link to="/shop" className="btn btn-secondary">
          Back to shop
        </Link>
      </PageMessage>
    );
  }

  if (status === 'error') {
    return (
      <PageMessage title="Could not load this product" text={state.error}>
        <button type="button" className="btn btn-secondary" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </PageMessage>
    );
  }

  // key: when the id in the URL changes, the photo and the quantity start fresh.
  return <ProductDetails key={state.product.id} product={state.product} />;
}

// Empty, loading and error states (handbook 9.6): H3 title, one muted sentence, a secondary button.
function PageMessage({ title, text, children }) {
  return (
    <section className="container section empty-state" aria-live="polite">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {children}
    </section>
  );
}

function ProductDetails({ product }) {
  const { notify } = useToast();
  const [photo, setPhoto] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const soldOut = product.quantityInStock <= 0;
  const stock = stockLabel(product.quantityInStock);
  const photoNumbers = Array.from({ length: product.imageCount }, (_, i) => i + 1);

  function handleAddToCart() {
    if (soldOut) return;
    const qty = clampQuantity(quantity, product.quantityInStock);
    // TODO(Sprint 2): call addItem(product, qty) from useCart() when CartContext exists.
    notify(`Added ${qty} × ${product.name} to your cart`);
  }

  return (
    <section className="container product-page">
      <div className="product-layout">
        {/* ----- Left: photo gallery ----- */}
        <div className="product-gallery">
          <div className="photo-panel product-photo-main">
            <img src={productImage(product, photo)} alt={`${product.name}, photo ${photo}`} />
          </div>

          {product.imageCount > 1 && (
            <div className="product-thumbs">
              {photoNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`photo-panel product-thumb${n === photo ? ' product-thumb-active' : ''}`}
                  aria-label={`Show photo ${n}`}
                  aria-pressed={n === photo}
                  onClick={() => setPhoto(n)}
                >
                  <img src={productImage(product, n)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ----- Right: product info ----- */}
        <div className="product-info">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="product-title">{product.name}</h1>
          <p className="product-model">{product.model}</p>

          <div className="product-price-row">
            <p className="product-price">{formatPrice(product.price)}</p>
            <ProductBadge product={product} />
          </div>

          <p className={`product-stock product-stock-${stock.tone}`}>{stock.text}</p>

          <p className="product-description">{product.description}</p>

          <div className="product-buy">
            <QuantityStepper
              value={quantity}
              max={product.quantityInStock}
              onChange={setQuantity}
              disabled={soldOut}
            />
            <button
              type="button"
              className="btn btn-primary product-add"
              disabled={soldOut}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              Add to cart
            </button>
          </div>

          {soldOut && (
            <p className="product-soldout-note">
              This product is sold out, so it cannot be added to the cart right now. You can still
              find it in search.
            </p>
          )}

          {/* ----- Specs: all requirement 9 fields not shown above ----- */}
          <dl className="product-specs">
            <SpecRow label="Product ID" value={product.id} />
            <SpecRow label="Serial number" value={product.serialNumber} />
            <SpecRow label="Model" value={product.model} />
            <SpecRow label="Warranty" value={product.warrantyStatus} />
            <SpecRow label="Distributor" value={product.distributor} />
            <SpecRow label="Stock" value={`${product.quantityInStock} units`} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SpecRow({ label, value }) {
  return (
    <div className="product-spec">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
