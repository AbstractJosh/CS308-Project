// The guest cart in localStorage (handbook 9.7, key crema_guest_cart). Owner: Neslihan (SCRUM-71).
// Only CartContext uses this file. Everything here is plain functions, so it is tested without React.
// An item is { productId, quantity, product: { id, name, model, serialNumber, price, imageCount,
// quantityInStock } }: the product fields the cart page needs, saved when the item was added.

const KEY = 'crema_guest_cart';

// Builds the Cart object of handbook 8.1: { items, itemCount, subtotal }.
// itemCount counts units (2 grinders = 2), subtotal is rounded to 2 decimals.
export function buildCart(items) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  return { items, itemCount, subtotal: Math.round(subtotal * 100) / 100 };
}

const isValidItem = (item) =>
  item && Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.product;

// Broken or old data in localStorage gives an empty cart instead of a crash.
export function loadGuestItems() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter(isValidItem) : [];
  } catch {
    return [];
  }
}

export function saveGuestItems(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearGuestItems() {
  localStorage.removeItem(KEY);
}

// The product fields a guest cart keeps (handbook 9.7).
function snapshot(product) {
  const { id, name, model, serialNumber, price, imageCount, quantityInStock } = product;
  return { id, name, model, serialNumber, price, imageCount, quantityInStock };
}

// An error with the same messages as the cart API (docs/API.md), so the page shows the same text.
function cartError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

// Adds quantity to what is already in the cart, capped at stock, like POST /cart/items.
export function addGuestItem(items, product, quantity) {
  const stock = product.quantityInStock;
  if (stock <= 0) throw cartError('This product is out of stock');
  const line = items.find((item) => item.productId === product.id);
  const current = line ? line.quantity : 0;
  if (current >= stock) throw cartError(`Only ${stock} in stock`);
  const newQuantity = Math.min(current + quantity, stock);
  if (line) {
    return items.map((item) =>
      item.productId === product.id ? { ...item, quantity: newQuantity, product: snapshot(product) } : item
    );
  }
  return [...items, { productId: product.id, quantity: newQuantity, product: snapshot(product) }];
}

// Sets the quantity, like PATCH /cart/items/:productId. Above stock is an error.
export function setGuestQuantity(items, productId, quantity) {
  const line = items.find((item) => item.productId === productId);
  if (!line) return items;
  if (quantity > line.product.quantityInStock) throw cartError(`Only ${line.product.quantityInStock} in stock`);
  return items.map((item) => (item.productId === productId ? { ...item, quantity } : item));
}

export function removeGuestItem(items, productId) {
  return items.filter((item) => item.productId !== productId);
}
