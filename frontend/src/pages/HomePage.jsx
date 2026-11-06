import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { formatPrice } from '../utils/format.js';
import { productImage } from '../utils/images.js';
import { categoriesApi, productsApi } from '../utils/fakeCatalog.js';
import './HomePage.css';

const BEST_SELLER_COUNT = 3;
const HERO_CATEGORY = 'espresso-machines';

function byPopularity(first, second) {
  return second.popularity - first.popularity || first.id - second.id;
}

function pickHeroProduct(products) {
  return [...products]
    .filter((product) => product.category.slug === HERO_CATEGORY && product.inStock)
    .sort(byPopularity)[0];
}

function HeroStat({ value, label }) {
  return (
    <div className="home-stat">
      <dt className="home-stat-label">{label}</dt>
      <dd className="home-stat-value">{value}</dd>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    Promise.all([categoriesApi.list(), productsApi.list()])
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
  }, [attempt]);

  const heroProduct = pickHeroProduct(products);
  const bestSellers = [...products].sort(byPopularity).slice(0, BEST_SELLER_COUNT);
  const ready = status === 'ready';

  return (
    <>
      <section className="section">
        <div className="container home-hero">
          <div className="home-hero-text">
            <p className="eyebrow">Specialty coffee · Machines</p>
            <h1>
              Better coffee,
              <br />
              <em>starts at home.</em>
            </h1>
            <div className="home-hero-divider" />
            <p className="home-hero-lead">
              Espresso machines, fresh beans and everything around them, chosen for people who care about their morning
              cup.
            </p>
            <div className="home-hero-actions">
              <Link to="/shop" className="btn btn-primary">
                Shop machines
                <ArrowRight size={20} strokeWidth={1.5} />
              </Link>
              <Link to="/shop/coffee" className="btn btn-secondary">
                Explore coffee
              </Link>
            </div>
            <dl className="home-stats">
              <HeroStat value={ready ? products.length : '–'} label="Products" />
              <HeroStat value={ready ? categories.length : '–'} label="Categories" />
              <HeroStat value="2-year" label="Warranty on machines" />
            </dl>
          </div>

          {heroProduct && (
            <div className="home-hero-visual">
              <div className="home-hero-arch">
                <img src={productImage(heroProduct)} alt={heroProduct.name} />
              </div>
              <Link to={`/products/${heroProduct.id}`} className="home-hero-card">
                <span className="home-hero-card-name">{heroProduct.name}</span>
                <span className="home-hero-card-price">{formatPrice(heroProduct.price)}</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {status === 'loading' && (
        <section className="section">
          <div className="container empty-state">
            <h3>Loading products</h3>
            <p className="muted">This only takes a moment.</p>
          </div>
        </section>
      )}

      {status === 'error' && (
        <section className="section">
          <div className="container empty-state">
            <h3>Something went wrong</h3>
            <p className="muted">{error}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </button>
          </div>
        </section>
      )}

      {ready && (
        <>
          <section className="section home-section">
            <div className="container">
              <div className="home-section-head">
                <div>
                  <p className="eyebrow">Browse</p>
                  <h2>
                    Shop by <em>category</em>
                  </h2>
                </div>
                <p className="home-section-count">{categories.length} CATEGORIES</p>
              </div>
              <div className="home-categories">
                {categories.map((category) => (
                  <Link key={category.id} to={`/shop/${category.slug}`} className="card home-category">
                    <h3 className="home-category-name">{category.name}</h3>
                    <p className="muted home-category-description">{category.description}</p>
                    <span className="home-category-count">{category.productCount} PRODUCTS</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="section home-section">
            <div className="container">
              <div className="home-section-head">
                <div>
                  <p className="eyebrow">Most loved</p>
                  <h2>
                    Our <em>best</em> sellers
                  </h2>
                </div>
                <Link to="/shop" className="text-link">
                  View all
                </Link>
              </div>
              <div className="product-grid">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
