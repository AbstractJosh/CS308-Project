import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Lock, MapPin } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';
import {
  checkoutBody,
  checkoutServerErrors,
  formatCardNumber,
  formatExpiry,
  validateAddress,
  validateCard,
} from '../utils/checkoutForm.js';
import { fakeCheckout } from './CheckoutPage.fakeData.js';
import './CheckoutPage.css';

// Checkout page, route /checkout, only for logged-in users (handbook 7.3, 7.4, 9.6).
// Owner: Sezin (SCRUM-53). Step 1: delivery address. Step 2: card payment (req 15).
// The card details stay in this page's memory only: never in localStorage, never logged.
const EMPTY_CARD = { holderName: '', number: '', expiry: '', cvv: '' };

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, ready } = useCart();
  const [step, setStep] = useState('address'); // 'address' -> 'payment' -> 'done'
  // null = not edited yet, so the home address is shown, even if the user loads a moment later.
  const [editedAddress, setEditedAddress] = useState(null);
  const address = editedAddress ?? user?.homeAddress ?? '';
  const [result, setResult] = useState(null);

  if (!ready) return <PageMessage title="Loading your cart" text="One moment." />;

  if (step === 'done') return <OrderPlaced result={result} />;

  if (cart.items.length === 0) {
    return (
      <PageMessage title="Your cart is empty" text="Add something to your cart before checking out.">
        <Link to="/shop" className="btn btn-secondary">
          Back to shop
        </Link>
      </PageMessage>
    );
  }

  // Sold-out products cannot be bought (req 7); the cart page shows which ones to remove.
  if (cart.items.some((item) => item.product.quantityInStock <= 0)) {
    return (
      <PageMessage title="Some items are sold out" text="Remove them from your cart to check out.">
        <Link to="/cart" className="btn btn-secondary">
          Back to cart
        </Link>
      </PageMessage>
    );
  }

  return (
    <section className="checkout-page">
      <div className="container">
        <header className="checkout-header">
          <p className="eyebrow">Checkout</p>
          <h1 className="checkout-title">
            Almost <em>there.</em>
          </h1>
          <Steps current={step} />
        </header>

        <div className="checkout-layout">
          <div className="card checkout-panel">
            {step === 'address' ? (
              <AddressStep
                address={address}
                onChange={setEditedAddress}
                onContinue={() => setStep('payment')}
              />
            ) : (
              <PaymentStep
                address={address}
                cart={cart}
                onChangeAddress={() => setStep('address')}
                onPaid={(answer) => {
                  setResult(answer);
                  setStep('done');
                }}
              />
            )}
          </div>

          <OrderSummary cart={cart} />
        </div>
      </div>
    </section>
  );
}

function Steps({ current }) {
  const steps = [
    { id: 'address', label: 'Delivery address' },
    { id: 'payment', label: 'Payment' },
  ];
  return (
    <ol className="checkout-steps" aria-label="Checkout steps">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={s.id === current ? 'checkout-step checkout-step-active' : 'checkout-step'}
          aria-current={s.id === current ? 'step' : undefined}
        >
          <span className="checkout-step-number">{i + 1}</span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}

// ---------- Step 1: delivery address ----------
function AddressStep({ address, onChange, onContinue }) {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateAddress(address) : {};

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateAddress(address)).length === 0) onContinue();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="checkout-panel-title">
        <MapPin size={20} strokeWidth={1.5} /> Delivery address
      </h2>
      <FormField
        id="deliveryAddress"
        label="Deliver to"
        as="textarea"
        rows={4}
        autoComplete="street-address"
        value={address}
        onChange={(event) => onChange(event.target.value)}
        error={errors.deliveryAddress}
        hint="We filled in your home address. You can change it for this order."
      />
      <button type="submit" className="btn btn-primary checkout-submit">
        Continue to payment
      </button>
    </form>
  );
}

// ---------- Step 2: card payment ----------
function PaymentStep({ address, cart, onChangeAddress, onPaid }) {
  const [card, setCard] = useState(EMPTY_CARD);
  const [submitted, setSubmitted] = useState(false);
  const [apiErrors, setApiErrors] = useState({ fields: {}, form: '' });
  const [sending, setSending] = useState(false);

  const errors = { ...(submitted ? validateCard(card) : {}), ...apiErrors.fields };

  function handleChange(event) {
    const { name, value } = event.target;
    const formatted =
      name === 'number' ? formatCardNumber(value)
        : name === 'expiry' ? formatExpiry(value)
          : name === 'cvv' ? value.replace(/\D/g, '').slice(0, 4)
            : value;
    setCard((current) => ({ ...current, [name]: formatted }));
    // Remove the server's message for this field (an "undefined" left behind would hide the form's).
    setApiErrors(({ fields: { [name]: _old, ...otherFields } }) => ({ fields: otherFields, form: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateCard(card)).length > 0) return;

    setSending(true);
    try {
      // TODO(SCRUM-54): send this body to the real POST /checkout instead of fakeCheckout.
      onPaid(await fakeCheckout(checkoutBody(address, card), cart));
    } catch (err) {
      setApiErrors(checkoutServerErrors(err));
      // After a refused payment the CVV is typed again, like on real shops.
      setCard((current) => ({ ...current, cvv: '' }));
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="checkout-address-recap">
        <div>
          <p className="checkout-label">Deliver to</p>
          <p className="checkout-address-text">{address.trim()}</p>
        </div>
        <button type="button" className="checkout-link" onClick={onChangeAddress}>
          Change
        </button>
      </div>

      <h2 className="checkout-panel-title">
        <CreditCard size={20} strokeWidth={1.5} /> Card payment
      </h2>
      <FormField
        id="holderName"
        label="Name on card"
        autoComplete="cc-name"
        value={card.holderName}
        onChange={handleChange}
        error={errors.holderName}
      />
      <FormField
        id="number"
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        value={card.number}
        onChange={handleChange}
        error={errors.number}
      />
      <div className="checkout-row">
        <FormField
          id="expiry"
          label="Expiry (MM/YY)"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={card.expiry}
          onChange={handleChange}
          error={errors.expiry}
        />
        <FormField
          id="cvv"
          label="CVV"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={card.cvv}
          onChange={handleChange}
          error={errors.cvv}
        />
      </div>

      <p className="muted checkout-test-cards">
        Test cards: 4242 4242 4242 4242 is approved, 4000 0000 0000 0002 is rejected by the bank.
      </p>

      {apiErrors.form && (
        <p className="field-error checkout-form-error" role="alert">
          {apiErrors.form}
        </p>
      )}

      <button type="submit" className="btn btn-primary checkout-submit" disabled={sending}>
        <Lock size={16} strokeWidth={1.5} />
        {sending ? 'Paying…' : `Pay ${formatPrice(cart.subtotal)}`}
      </button>
      <p className="muted checkout-safe-note">
        We never save your full card number or CVV, only the last 4 digits.
      </p>
    </form>
  );
}

// ---------- Right side: what is being bought ----------
function OrderSummary({ cart }) {
  return (
    <aside className="card checkout-summary" aria-label="Order summary">
      <h2 className="checkout-summary-title">Your order</h2>
      <ul className="checkout-summary-items">
        {cart.items.map((item) => (
          <li key={item.productId}>
            <span>
              {item.product.name} <span className="muted">× {item.quantity}</span>
            </span>
            <span>{formatPrice(item.product.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="checkout-summary-total">
        <span>Total</span>
        <span>{formatPrice(cart.subtotal)}</span>
      </div>
      <Link to="/cart" className="text-link checkout-edit-cart">
        Edit cart
      </Link>
    </aside>
  );
}

// ---------- After paying (SCRUM-54 adds the full confirmation and invoice screen) ----------
function OrderPlaced({ result }) {
  return (
    <PageMessage
      title="Thank you, your order is placed"
      text={`Order #${result.order.id} is being processed. Paid ${formatPrice(result.order.total)} with the card ending ${result.order.cardLast4}.`}
    >
      <Link to="/shop" className="btn btn-secondary">
        Back to shop
      </Link>
    </PageMessage>
  );
}

// Empty, loading and done states (handbook 9.6): H3 title, one muted sentence, a button.
function PageMessage({ title, text, children }) {
  return (
    <section className="checkout-page">
      <div className="container section empty-state" aria-live="polite">
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        {children}
      </div>
    </section>
  );
}
