// Admin sub-menu per role (handbook 9.6 "Admin pages" and 9.8 routes). Owner: Neslihan (SCRUM-56).
// When you build one of these pages, add its <Route> in App.jsx (admin block) and change
// nothing here, unless the page moves to another sprint.
// The support agent has its own screen at /support, so only the two managers use /admin.

export const ROLE_LABELS = {
  PRODUCT_MANAGER: 'Product manager',
  SALES_MANAGER: 'Sales manager',
};

export const ADMIN_ROLES = Object.keys(ROLE_LABELS);

export const ADMIN_MENU = {
  PRODUCT_MANAGER: [
    { path: 'deliveries', label: 'Deliveries', sprint: 2 },
    { path: 'products', label: 'Products', sprint: 3 },
    { path: 'stock', label: 'Stock', sprint: 3 },
    { path: 'comments', label: 'Comments', sprint: 3 },
    { path: 'invoices', label: 'Invoices', sprint: 3 },
  ],
  SALES_MANAGER: [
    { path: 'pricing', label: 'Pricing', sprint: 4 },
    { path: 'invoices', label: 'Invoices', sprint: 4 },
    { path: 'reports', label: 'Reports', sprint: 4 },
    { path: 'refunds', label: 'Refunds', sprint: 4 },
  ],
};

// The menu item for /admin/<section> if this role may open it, otherwise undefined.
export function menuItem(role, section) {
  return (ADMIN_MENU[role] || []).find((item) => item.path === section);
}

// true if any role has this page, so an unknown address can still give "not found".
export function isAdminPage(section) {
  return Object.values(ADMIN_MENU).some((items) => items.some((item) => item.path === section));
}
