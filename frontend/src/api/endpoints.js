import { api } from './client.js';

// One object per area with the API calls the pages use, built on api() from client.js.
// Example: export const productsApi = { list: (slug) => api(`/products?category=${slug}`, { auth: false }) };
// Shared file: only ADD your object inside your own area's block.
// Never rewrite, reorder or delete other people's lines.

export const healthApi = {
  check: () => api('/health', { auth: false }),
};

// ===== AUTH: authApi (Ulukan) =====
export const authApi = {
  register: (form) => api('/auth/register', { method: 'POST', body: form, auth: false }),
  login: (credentials) => api('/auth/login', { method: 'POST', body: credentials, auth: false }),
  me: () => api('/auth/me'),
};

// ===== CATALOG: productsApi, categoriesApi (Luis, Sidar) =====
// SCRUM-13: productsApi.list() -> { products }, productsApi.list('coffee') -> one category,
// productsApi.get(id) -> { product }, categoriesApi.list() -> { categories }.
export const productsApi = {
  list: (category) =>
    api(category ? `/products?category=${encodeURIComponent(category)}` : '/products', { auth: false }),
  get: (id) => api(`/products/${encodeURIComponent(id)}`, { auth: false }),
  browse: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
    return api(query ? `/products?${query}` : '/products', { auth: false });
  },
};

export const categoriesApi = {
  list: () => api('/categories', { auth: false }),
};

// ===== CART: cartApi (Luis, Sezin) =====
// SCRUM-71 (Neslihan): Luis's cart routes (SCRUM-33, docs/API.md). Every call answers { cart }.
export const cartApi = {
  get: () => api('/cart'),
  addItem: (productId, quantity) => api('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateItem: (productId, quantity) =>
    api(`/cart/items/${encodeURIComponent(productId)}`, { method: 'PATCH', body: { quantity } }),
  removeItem: (productId) => api(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  merge: (items) => api('/cart/merge', { method: 'POST', body: { items } }),
};

// ===== ORDERS: ordersApi, checkoutApi (Luis, Ulukan, Sidar) =====

// ===== ADMIN: adminApi (Neslihan, Murat, Sidar) =====
// SCRUM-57 (Neslihan): delivery list for the product manager. completed: true, false or undefined (all).
export const adminApi = {
  deliveries: (completed) =>
    api(completed === undefined ? '/admin/deliveries' : `/admin/deliveries?completed=${completed}`),
};
