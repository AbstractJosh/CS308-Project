import { api } from './client.js';

// One object per area with the API calls the pages use, built on api() from client.js.
// Example: export const productsApi = { list: (slug) => api(`/products?category=${slug}`, { auth: false }) };
// Shared file: only ADD your object inside your own area's block.
// Never rewrite, reorder or delete other people's lines.

export const healthApi = {
  check: () => api('/health', { auth: false }),
};

// ===== AUTH: authApi (Ulukan) =====

// ===== CATALOG: productsApi, categoriesApi (Luis, Sidar) =====

// ===== CART: cartApi (Luis, Sezin) =====

// ===== ORDERS: ordersApi, checkoutApi (Luis, Ulukan, Sidar) =====

// ===== ADMIN: adminApi (Neslihan, Murat, Sidar) =====
