import { Minus, Plus } from 'lucide-react';
import './QuantityStepper.css';

// The cart never allows more than 99 of one product (handbook 7.3).
export const MAX_QUANTITY = 99;

// Keeps a quantity between 1 and the highest allowed value.
// The highest allowed value is the stock, but never above 99.
// clampQuantity(0, 5) -> 1, clampQuantity(8, 5) -> 5, clampQuantity(150, 200) -> 99
export function clampQuantity(value, max) {
  const limit = Math.max(1, Math.min(Number(max) || 0, MAX_QUANTITY));
  const n = Math.floor(Number(value)) || 1;
  return Math.min(Math.max(n, 1), limit);
}

// "- 1 +" control. Owner: Sezin (handbook 5.3). Used on the product page, later in the cart.
// Props: value (current quantity), max (usually the stock), onChange(newQuantity), disabled.
export default function QuantityStepper({ value, max, onChange, disabled = false }) {
  const current = clampQuantity(value, max);
  const limit = clampQuantity(MAX_QUANTITY, max);

  return (
    <div className={`qty-stepper${disabled ? ' qty-stepper-disabled' : ''}`}>
      <button
        type="button"
        className="qty-stepper-btn"
        aria-label="Decrease quantity"
        disabled={disabled || current <= 1}
        onClick={() => onChange(clampQuantity(current - 1, max))}
      >
        <Minus size={18} strokeWidth={1.5} />
      </button>
      <span className="qty-stepper-value" aria-label="Quantity" aria-live="polite">
        {current}
      </span>
      <button
        type="button"
        className="qty-stepper-btn"
        aria-label="Increase quantity"
        disabled={disabled || current >= limit}
        onClick={() => onChange(clampQuantity(current + 1, max))}
      >
        <Plus size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
