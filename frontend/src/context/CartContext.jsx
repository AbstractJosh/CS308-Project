import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cartApi } from '../api/endpoints.js';
import { useAuth } from './AuthContext.jsx';
import {
  addGuestItem,
  buildCart,
  clearGuestItems,
  loadGuestItems,
  removeGuestItem,
  saveGuestItems,
  setGuestQuantity,
} from '../utils/cartStorage.js';

// The cart for the whole site (handbook 4.2 and 9.7). Owner: Neslihan (SCRUM-71).
// Usage: const { cart, ready, addItem, updateQuantity, removeItem } = useCart();
// Guests keep the cart in localStorage; logged-in users use the cart API (SCRUM-33).
// When a guest logs in, the guest cart is sent once to POST /cart/merge and then cleared,
// so it is kept after login (req 4, SCRUM-34). addItem, updateQuantity and removeItem return
// the new cart and throw the API error (message, status), so the page can show it in a toast.
const EMPTY_CART = buildCart([]);

// Without a CartProvider (for example in a page test) the cart is empty and nothing is saved.
const CartContext = createContext({
  cart: EMPTY_CART,
  ready: true,
  addItem: async () => EMPTY_CART,
  updateQuantity: async () => EMPTY_CART,
  removeItem: async () => EMPTY_CART,
});

export function CartProvider({ children }) {
  const { user, loading } = useAuth();
  const userId = user ? user.id : null;
  const [cart, setCart] = useState(() => buildCart(loadGuestItems()));
  const [ready, setReady] = useState(false);
  // Counts loads, so an old answer (from before a login or logout) cannot overwrite a newer one.
  const loadCount = useRef(0);

  useEffect(() => {
    if (loading) return; // wait until we know who is logged in
    loadCount.current += 1;
    const thisLoad = loadCount.current;
    const stillCurrent = () => thisLoad === loadCount.current;

    if (!userId) {
      setCart(buildCart(loadGuestItems()));
      setReady(true);
      return;
    }

    setReady(false);
    const guestItems = loadGuestItems();
    const request = guestItems.length
      ? cartApi.merge(guestItems.map(({ productId, quantity }) => ({ productId, quantity })))
      : cartApi.get();

    request
      .then(({ cart: savedCart }) => {
        // The server has the guest items now; keep them only if the merge failed.
        if (guestItems.length) clearGuestItems();
        if (stillCurrent()) setCart(savedCart);
      })
      .catch(() => {
        if (stillCurrent()) setCart(EMPTY_CART);
      })
      .finally(() => {
        if (stillCurrent()) setReady(true);
      });
  }, [userId, loading]);

  // Guests: change the saved items. Users: call the API, which answers with the whole cart.
  async function change(guestChange, apiCall) {
    if (!userId) {
      const items = guestChange(loadGuestItems());
      saveGuestItems(items);
      const next = buildCart(items);
      setCart(next);
      return next;
    }
    const { cart: next } = await apiCall();
    setCart(next);
    return next;
  }

  const value = {
    cart,
    ready,
    addItem: (product, quantity = 1) =>
      change(
        (items) => addGuestItem(items, product, quantity),
        () => cartApi.addItem(product.id, quantity)
      ),
    updateQuantity: (productId, quantity) =>
      change(
        (items) => setGuestQuantity(items, productId, quantity),
        () => cartApi.updateItem(productId, quantity)
      ),
    removeItem: (productId) =>
      change(
        (items) => removeGuestItem(items, productId),
        () => cartApi.removeItem(productId)
      ),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
