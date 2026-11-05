import { createContext, useContext, useState } from 'react';
import { CATEGORIES, PRODUCTS, SEED_CHATS, SEED_COMMENTS, SEED_NOTES, SEED_ORDERS, SEED_REFUNDS, priceOf, todayISO } from './data.js';

// ponytail: all state is in-memory React state standing in for the Node + SQLite backend; replace each setter with an API call later.
const Store = createContext(null);
export const useStore = () => useContext(Store);
export const go = (path) => { location.hash = '/' + path; };

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [categories, setCategories] = useState(CATEGORIES);
  const [cart, setCart] = useState({});
  const [wishlist, setWishlist] = useState(['P-1003', 'P-1006', 'P-1004']);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(SEED_ORDERS);
  const [comments, setComments] = useState(SEED_COMMENTS);
  const [refunds, setRefunds] = useState(SEED_REFUNDS);
  const [chats, setChats] = useState(SEED_CHATS);
  const [notes, setNotes] = useState(SEED_NOTES);

  const product = (id) => products.find((p) => p.id === id);
  const catName = (id) => categories.find((c) => c.id === id)?.name || id;
  const cartLines = Object.entries(cart).map(([pid, qty]) => ({ p: product(pid), qty })).filter((l) => l.p && l.qty > 0);
  const setQty = (pid, qty) => setCart((c) => ({ ...c, [pid]: Math.max(0, Math.min(product(pid)?.stock ?? 0, qty)) }));
  const addToCart = (pid, n = 1) => {
    const before = cart[pid] || 0;
    setQty(pid, before + n);
    return before < product(pid).stock;
  };
  const restock = (pid, qty) => setProducts((ps) => ps.map((p) => (p.id === pid ? { ...p, stock: p.stock + qty } : p)));
  const patchOrder = (id, patch) => setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const patchLine = (oid, pid, patch) =>
    setOrders((os) => os.map((o) => (o.id !== oid ? o : { ...o, items: o.items.map((i) => (i.pid === pid ? { ...i, ...patch } : i)) })));
  const notify = (customerId, title, body) =>
    setNotes((ns) => [{ id: Date.now() + Math.random(), customerId, date: todayISO(), title, body }, ...ns]);

  const placeOrder = (address, card) => {
    const short = cartLines.find((l) => l.qty > l.p.stock);
    if (short) return { error: `Only ${short.p.stock} left of ${short.p.name}. Please update your cart.` };
    const id = 'CR-' + (Math.max(...orders.map((o) => Number(o.id.slice(3)))) + 1);
    const items = cartLines.map((l) => ({ pid: l.p.id, name: l.p.name, qty: l.qty, price: priceOf(l.p), listPrice: l.p.price }));
    const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
    setProducts((ps) => ps.map((p) => (cart[p.id] ? { ...p, stock: p.stock - cart[p.id], sold: p.sold + cart[p.id] } : p)));
    setOrders((os) => [{ id, customer: { ...user, address }, date: todayISO(), status: 'processing', card, ship: subtotal >= 1000 ? 0 : 89, items }, ...os]);
    setCart({});
    return { id };
  };

  const value = {
    products, setProducts, categories, setCategories, cart, wishlist, setWishlist, user, setUser,
    orders, comments, setComments, refunds, setRefunds, chats, setChats, notes,
    product, catName, cartLines, setQty, addToCart, restock, patchOrder, patchLine, notify, placeOrder,
  };
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
