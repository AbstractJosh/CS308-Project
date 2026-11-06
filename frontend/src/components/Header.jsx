import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import './Header.css';

const ICON_PROPS = { size: 20, strokeWidth: 1.5 };

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(event) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
    setSearchOpen(false);
    setMenuOpen(false);
    setQuery('');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="site-logo" onClick={closeMenu}>
          <span className="site-logo-name">CREMA &amp; CO.</span>
          <span className="site-logo-tagline">COFFEE · MACHINES · CARE</span>
        </Link>

        <nav className={`site-nav${menuOpen ? ' site-nav-open' : ''}`} aria-label="Main">
          <NavLink to="/" end className="site-nav-link" onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/shop" className="site-nav-link" onClick={closeMenu}>
            Shop
          </NavLink>
        </nav>

        <div className="site-actions">
          <button
            type="button"
            className="site-icon-button"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search {...ICON_PROPS} />
          </button>
          <Link to="/login" className="site-icon-button" aria-label="Account" onClick={closeMenu}>
            <User {...ICON_PROPS} />
          </Link>
          <Link to="/cart" className="site-icon-button" aria-label="Cart" onClick={closeMenu}>
            <ShoppingCart {...ICON_PROPS} />
          </Link>
          <button
            type="button"
            className="site-icon-button site-menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X {...ICON_PROPS} /> : <Menu {...ICON_PROPS} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="site-search">
          <form className="container site-search-form" role="search" onSubmit={handleSearch}>
            <input
              className="input"
              type="search"
              name="q"
              placeholder="Search products"
              aria-label="Search products"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
