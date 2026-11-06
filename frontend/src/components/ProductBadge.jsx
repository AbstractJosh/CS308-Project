const BEST_SELLER_POPULARITY = 150;
const LOW_STOCK_LIMIT = 5;

function badgeText(product) {
  const stock = product.quantityInStock;
  if (stock === 0) return 'SOLD OUT';
  if (stock <= LOW_STOCK_LIMIT) return `ONLY ${stock} LEFT`;
  if (product.popularity >= BEST_SELLER_POPULARITY) return 'BEST SELLER';
  return null;
}

export default function ProductBadge({ product, className = '' }) {
  const text = badgeText(product);
  if (!text) return null;
  return <span className={`badge ${className}`.trim()}>{text}</span>;
}
