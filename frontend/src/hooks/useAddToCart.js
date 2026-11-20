import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// "Add to cart" for the product page and the product cards. Owner: Neslihan (SCRUM-71).
// Usage: const addToCart = useAddToCart(); addToCart(product, 2);
// Shows a toast: "Added 2 × <name> to your cart", or the error (for example "Only 3 in stock").
export function useAddToCart() {
  const { addItem } = useCart();
  const { notify } = useToast();

  return async function addToCart(product, quantity = 1) {
    try {
      await addItem(product, quantity);
      notify(`Added ${quantity} × ${product.name} to your cart`);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    }
  };
}
