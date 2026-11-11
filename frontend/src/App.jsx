import { Routes, Route } from 'react-router-dom';

// All routes of the site (handbook 9.8).
// Shared file: only ADD your imports and routes inside your own area's block.
// Never rewrite, reorder or delete other people's lines.

// ----- imports: LAYOUT (Sidar: Header, Footer) -----
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

// ----- imports: PAGES (owners replace their own placeholder page file, not these lines) -----
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// ----- imports: Sprint 2 and later pages -----
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import CartPage from './pages/CartPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';

// ----- imports: ADMIN (Neslihan: layout; page owners add their admin page imports here) -----
import RoleRoute from './components/RoleRoute.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminComingSoon from './pages/admin/AdminComingSoon.jsx';
import { ADMIN_ROLES } from './pages/admin/adminMenu.js';

export default function App() {
  return (
    <>
      {/* LAYOUT: Sidar puts <Header /> here */}
      <Header />
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
          <Route
            path="/checkout"
            element={
              <ProtectedRoute reason="checkout">
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          {/* ===== ADMIN: only product and sales managers (SCRUM-56) ===== */}
          <Route
            path="/admin"
            element={
              <RoleRoute roles={ADMIN_ROLES}>
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<AdminHome />} />
            {/* Page owners add theirs here, e.g. <Route path="deliveries" element={<DeliveriesPage />} /> */}
            <Route path="*" element={<AdminComingSoon />} />
          </Route>

          {/* Keep this one last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* LAYOUT: Sidar puts <Footer /> here */}
      <Footer />
    </>
  );
}
