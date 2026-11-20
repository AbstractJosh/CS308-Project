import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { formatPrice, stockLabel } from '../utils/format.js';
import { productImage } from '../utils/images.js';
import ProductBadge from './ProductBadge.jsx';
import './ProductCard.css';

const DISTRIBUTOR_SUFFIX = / official distributor$/;

export default function ProductCard({ product }) {
  const addToCart = useAddToCart();
  const brand = product.distributor.replace(DISTRIBUTOR_SUFFIX, '');
  const stock = stockLabel(product.quantityInStock);

  return (
    <article className="card product-card">
      <div className="product-card-media">
        <div className="photo-panel product-card-photo">
          <img src={productImage(product)} alt={product.name} loading="lazy" />
        </div>
        <ProductBadge product={product} className="product-card-badge" />
        <button
          type="button"
          className="product-card-add"
          aria-label={`Add ${product.name} to cart`}
          disabled={!product.inStock}
          onClick={() => addToCart(product, 1)}
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      </div>
      <div className="product-card-body">
        <h3 className="product-card-name">
          <Link to={`/products/${product.id}`} className="product-card-link">
            {product.name}
          </Link>
        </h3>
        <p className="product-card-meta">
          {brand} · {product.model}
        </p>
        <div className="product-card-footer">
          <span className="product-card-price">{formatPrice(product.price)}</span>
          <span className={`product-card-stock product-card-stock-${stock.tone}`}>{stock.text}</span>
        </div>
      </div>
    </article>
  );
}
