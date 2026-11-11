import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { categoriesApi, productsApi } from '../api/endpoints.js';
import './CatalogPage.css';

const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Most popular' },
];

function PageTitle({ category, query }) {
  if (query) {
    return (
      <h1>
        Search <em>results</em>
      </h1>
    );
  }
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
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const sortParam = searchParams.get('sort') ?? '';
  const sort = SORT_OPTIONS.some((option) => option.value === sortParam) ? sortParam : '';
  const requestKey = `${slug ?? ''}?${query}&${sort}`;
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [requestedKey, setRequestedKey] = useState(requestKey);

  if (requestKey !== requestedKey) {
    setRequestedKey(requestKey);
    setStatus('loading');
  }

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    const productRequest = productsApi.browse({ category: slug, q: query, sort }).catch((err) => {
      if (err.status === 400 && slug) return { products: [] };
      throw err;
    });
    Promise.all([categoriesApi.list(), productRequest])
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
  }, [slug, query, sort, attempt]);

  function handleSortChange(event) {
    const next = new URLSearchParams(searchParams);
    if (event.target.value) next.set('sort', event.target.value);
    else next.delete('sort');
    setSearchParams(next);
  }

  const category = categories.find((item) => item.slug === slug);
  const unknownCategory = status === 'ready' && Boolean(slug) && !category;
  const keptParams = new URLSearchParams();
  if (query) keptParams.set('q', query);
  if (sort) keptParams.set('sort', sort);
  const keptQuery = keptParams.toString();
  const searchSuffix = keptQuery ? `?${keptQuery}` : '';
  const clearSearchPath = `${slug ? `/shop/${slug}` : '/shop'}${sort ? `?sort=${sort}` : ''}`;
  let eyebrow = category ? 'Category' : 'Shop';
  if (query) eyebrow = 'Search';

  return (
    <section className="section">
      <div className="container">
        <div className="catalog-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <PageTitle category={category} query={query} />
            {query && (
              <p className="muted catalog-description">
                Results for “{query}”{category && ` in ${category.name}`}.
                {status === 'ready' && products.length > 0 && (
                  <>
                    {' '}
                    <Link to={clearSearchPath} className="text-link">
                      Clear search
                    </Link>
                  </>
                )}
              </p>
            )}
            {!query && category && <p className="muted catalog-description">{category.description}</p>}
          </div>
          {!unknownCategory && (
            <div className="catalog-tools">
              {status === 'ready' && (
                <p className="catalog-count">
                  {products.length} {products.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
                </p>
              )}
              <label className="catalog-sort">
                <span className="field-label">Sort by</span>
                <select className="input" value={sort} onChange={handleSortChange}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <nav className="catalog-chips" aria-label="Categories">
          <CategoryChip to={`/shop${searchSuffix}`} label="All" active={!slug} />
          {categories.map((item) => (
            <CategoryChip
              key={item.id}
              to={`/shop/${item.slug}${searchSuffix}`}
              label={item.name}
              active={item.slug === slug}
            />
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

        {status === 'ready' && !unknownCategory && products.length === 0 && query && (
          <PageMessage title="No matches" text={`Nothing matches “${query}”. Try another word.`}>
            <Link to={clearSearchPath} className="btn btn-secondary">
              Clear search
            </Link>
          </PageMessage>
        )}

        {status === 'ready' && !unknownCategory && products.length === 0 && !query && (
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
