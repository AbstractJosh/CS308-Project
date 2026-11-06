import { Routes, Route } from 'react-router-dom';

// All routes of the site (handbook 9.8).
// Shared file: only ADD your imports and routes inside your own area's block.
// Never rewrite, reorder or delete other people's lines.

// ----- imports: LAYOUT (Sidar: Header, Footer) -----

// ----- imports: PAGES (owners replace their own placeholder page file, not these lines) -----
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// ----- imports: Sprint 2 and later pages -----

export default function App() {
  return (
    <>
      {/* LAYOUT: Sidar puts <Header /> here */}
      <main className="app-main">
        <Routes>
          {/* ===== Sprint 1 ===== */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<CatalogPage />} />
          <Route path="/shop/:category" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ===== Sprint 2 and later: add routes here ===== */}

          {/* Keep this one last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* LAYOUT: Sidar puts <Footer /> here */}
    </>
  );
}
