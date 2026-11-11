import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import './Header.css';

const ICON_PROPS = { size: 20, strokeWidth: 1.5 };
const ADMIN_PATHS = {
  PRODUCT_MANAGER: '/admin/deliveries',
  SALES_MANAGER: '/admin/pricing',
  SUPPORT_AGENT: '/support',
};

export default function Header() {
  const { user } = useAuth();
  const { cart } = useCart();
  const adminPath = user && ADMIN_PATHS[user.role];
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

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
          {user && (
            <NavLink to="/orders" className="site-nav-link" onClick={closeMenu}>
              Orders
            </NavLink>
          )}
          {adminPath && (
            <NavLink
              to={adminPath}
              className={({ isActive }) => `site-nav-link${isActive || inAdmin ? ' active' : ''}`}
              onClick={closeMenu}
            >
              Admin
            </NavLink>
          )}
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
          <Link to={user ? '/profile' : '/login'} className="site-icon-button" aria-label="Account" onClick={closeMenu}>
            <User {...ICON_PROPS} />
          </Link>
          <Link to="/cart" className="site-icon-button site-cart-button" aria-label="Cart" onClick={closeMenu}>
            <ShoppingCart {...ICON_PROPS} />
            {/* SCRUM-71: number of units in the cart (handbook 9.6) */}
            {cart.itemCount > 0 && (
              <span className="site-cart-count" aria-hidden="true" data-testid="cart-count">
                {cart.itemCount > 99 ? '99+' : cart.itemCount}
              </span>
            )}
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
