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
// SCRUM-13: productsApi.list() -> { products }, productsApi.list('coffee') -> one category,
// productsApi.get(id) -> { product }, categoriesApi.list() -> { categories }.
export const productsApi = {
  list: (category) =>
    api(category ? `/products?category=${encodeURIComponent(category)}` : '/products', { auth: false }),
  get: (id) => api(`/products/${encodeURIComponent(id)}`, { auth: false }),
};

export const categoriesApi = {
  list: () => api('/categories', { auth: false }),
};

// ===== CART: cartApi (Luis, Sezin) =====

// ===== ORDERS: ordersApi, checkoutApi (Luis, Ulukan, Sidar) =====

// ===== ADMIN: adminApi (Neslihan, Murat, Sidar) =====
