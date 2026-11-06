import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { categoriesApi, productsApi } from '../utils/fakeCatalog.js';
import './CatalogPage.css';

function PageTitle({ category }) {
  if (!category) {
    return (
      <h1>
        Our <em>shop</em>
      </h1>
    );
  }
  const words = category.name.split(' ');
  const lastWord = words.pop();
  return (
    <h1>
      {words.length > 0 && `${words.join(' ')} `}
      <em>{lastWord}</em>
    </h1>
  );
}

function CategoryChip({ to, label, active }) {
  const chipRef = useRef(null);

  useEffect(() => {
    if (active) chipRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <Link
      ref={chipRef}
      to={to}
      className={`chip${active ? ' chip-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}

function PageMessage({ title, text, children }) {
  return (
    <div className="section empty-state catalog-message">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  const { category: slug } = useParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [requestedSlug, setRequestedSlug] = useState(slug);

  if (slug !== requestedSlug) {
    setRequestedSlug(slug);
    setStatus('loading');
  }

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    Promise.all([categoriesApi.list(), productsApi.list(slug)])
      .then(([categoryData, productData]) => {
        if (stale) return;
        setCategories(categoryData.categories);
        setProducts(productData.products);
        setStatus('ready');
      })
      .catch((err) => {
        if (stale) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      stale = true;
    };
  }, [slug, attempt]);

  const category = categories.find((item) => item.slug === slug);
  const unknownCategory = status === 'ready' && Boolean(slug) && !category;

  return (
    <section className="section">
      <div className="container">
        <div className="catalog-head">
          <div>
            <p className="eyebrow">{category ? 'Category' : 'Shop'}</p>
            <PageTitle category={category} />
            {category && <p className="muted catalog-description">{category.description}</p>}
          </div>
          {status === 'ready' && !unknownCategory && (
            <p className="catalog-count">
              {products.length} {products.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </p>
          )}
        </div>

        <nav className="catalog-chips" aria-label="Categories">
          <CategoryChip to="/shop" label="All" active={!slug} />
          {categories.map((item) => (
            <CategoryChip key={item.id} to={`/shop/${item.slug}`} label={item.name} active={item.slug === slug} />
          ))}
        </nav>

        <h2 className="catalog-results-title">Products</h2>

        {status === 'loading' && <PageMessage title="Loading products" text="This only takes a moment." />}

        {status === 'error' && (
          <PageMessage title="Something went wrong" text={error}>
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </button>
          </PageMessage>
        )}

        {unknownCategory && (
          <PageMessage title="Category not found" text="This category does not exist.">
            <Link to="/shop" className="btn btn-secondary">
              Back to shop
            </Link>
          </PageMessage>
        )}

        {status === 'ready' && !unknownCategory && products.length === 0 && (
          <PageMessage title="Nothing here yet" text="There are no products in this category.">
            <Link to="/shop" className="btn btn-secondary">
              Back to shop
            </Link>
          </PageMessage>
        )}

        {status === 'ready' && !unknownCategory && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
