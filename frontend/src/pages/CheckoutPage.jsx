import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard, Download, Loader2, Lock, MapPin } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import OrderStatusPill from '../components/OrderStatusPill.jsx';
import { checkoutApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';
import { formatOrderDate } from '../utils/orderDates.js';
import { downloadInvoicePdf } from '../utils/invoicePdf.js';
import {
  checkoutBody,
  checkoutServerErrors,
  formatCardNumber,
  formatExpiry,
  validateAddress,
  validateCard,
} from '../utils/checkoutForm.js';
import './CheckoutPage.css';

// Checkout page, route /checkout, only for logged-in users (handbook 7.3, 7.4, 9.6).
// Owner: Sezin (SCRUM-53, SCRUM-54). Step 1: delivery address. Step 2: card payment (req 15),
// sent to POST /checkout. Then the confirmation with the invoice download (req 4).
// The card details stay in this page's memory only: never in localStorage, never logged.
const EMPTY_CARD = { holderName: '', number: '', expiry: '', cvv: '' };

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, ready, removeItem } = useCart();
  const [step, setStep] = useState('address'); // 'address' -> 'payment' -> 'done'
  // null = not edited yet, so the home address is shown, even if the user loads a moment later.
  const [editedAddress, setEditedAddress] = useState(null);
  const address = editedAddress ?? user?.homeAddress ?? '';
  // The server's message when it refuses the address (SCRUM-109); cleared when the address changes.
  const [addressError, setAddressError] = useState('');
  const [result, setResult] = useState(null);

  // SCRUM-108: after paying, the cart on this page must be empty too. POST /checkout already
  // emptied it on the server (handbook 7.4 step 6), but CartContext still holds the old items.
  // Every cart call answers with the server's cart, and removing an item that is no longer
  // there is fine, so these calls bring the page (and the header count) up to date.
  function syncCartAfterPaying(paidItems) {
    return Promise.allSettled(paidItems.map((item) => removeItem(item.productId)));
  }

  if (!ready) return <PageMessage title="Loading your cart" text="One moment." />;

  if (step === 'done') return <OrderConfirmation result={result} email={user?.email} />;

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
                serverError={addressError}
                onChange={(value) => {
                  setEditedAddress(value);
                  setAddressError('');
                }}
                onContinue={() => setStep('payment')}
              />
            ) : (
              <PaymentStep
                address={address}
                cart={cart}
                onChangeAddress={() => setStep('address')}
                onAddressRejected={(message) => {
                  setAddressError(message);
                  setStep('address');
                }}
                onPaid={(answer) => {
                  const paidItems = cart.items;
                  setResult(answer);
                  setStep('done');
                  syncCartAfterPaying(paidItems);
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
function AddressStep({ address, serverError, onChange, onContinue }) {
  // A rejected address comes back from the payment step already marked (SCRUM-109).
  const [submitted, setSubmitted] = useState(Boolean(serverError));
  const errors = submitted ? validateAddress(address) : {};
  if (!errors.deliveryAddress && serverError) errors.deliveryAddress = serverError;

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
function PaymentStep({ address, cart, onChangeAddress, onAddressRejected, onPaid }) {
  const [card, setCard] = useState(EMPTY_CARD);
  const [submitted, setSubmitted] = useState(false);
  const [apiErrors, setApiErrors] = useState({ fields: {}, form: '', kind: '' });
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
    // Remove the server's message for this field only (an "undefined" left behind would hide the
    // form's). The message above the button, like the bank's "rejected", stays until the next
    // try, so it does not vanish while the user types the CVV again (SCRUM-110).
    setApiErrors(({ fields: { [name]: _old, ...otherFields }, form, kind }) => ({ fields: otherFields, form, kind }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateCard(card)).length > 0) return;

    setApiErrors({ fields: {}, form: '', kind: '' });
    setSending(true);
    try {
      // POST /checkout (SCRUM-59): bank, order, payment and invoice in one go on the server.
      onPaid(await checkoutApi.create(checkoutBody(address, card)));
    } catch (err) {
      const errors = checkoutServerErrors(err);
      // SCRUM-109: the address is on the other step, so show the message there.
      if (errors.fields.deliveryAddress) {
        onAddressRejected(errors.fields.deliveryAddress);
        return;
      }
      setApiErrors(errors);
      // After a refused payment the CVV is typed again, like on real shops. The form starts
      // "untouched" again, so the empty CVV is not marked as a mistake at once (SCRUM-110).
      setCard((current) => ({ ...current, cvv: '' }));
      setSubmitted(false);
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* SCRUM-107: while the payment is on its way, nothing can be changed. Otherwise the
          order could be placed with an address or card the user thinks they changed. */}
      <fieldset className="checkout-fieldset" disabled={sending}>
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
      </fieldset>

      {/* Rejected state: the bank said no (402), stock ran out (409) or something else failed. */}
      {apiErrors.form && (
        <div className="checkout-alert" role="alert">
          <AlertCircle size={20} strokeWidth={1.5} />
          <div>
            <p className="checkout-alert-title">
              {apiErrors.kind === 'rejected'
                ? 'Payment rejected'
                : apiErrors.kind === 'stock'
                  ? 'Not enough stock'
                  : 'Your order was not placed'}
            </p>
            <p className="checkout-alert-text">{apiErrors.form}</p>
            {apiErrors.kind === 'stock' && (
              <Link to="/cart" className="text-link">
                Back to cart
              </Link>
            )}
          </div>
        </div>
      )}

      <button type="submit" className="btn btn-primary checkout-submit" disabled={sending}>
        {sending ? (
          <Loader2 size={16} strokeWidth={1.5} className="checkout-spinner" />
        ) : (
          <Lock size={16} strokeWidth={1.5} />
        )}
        {sending ? 'Processing payment…' : `Pay ${formatPrice(cart.subtotal)}`}
      </button>
      {/* Processing state: the bank is being asked; this can take a moment. */}
      {sending && (
        <p className="muted checkout-processing" role="status">
          Your payment is being processed. Please do not close or refresh this page.
        </p>
      )}
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

// ---------- Confirmation state: the order is placed (req 3, 4) ----------
// result = the POST /checkout answer: { order, invoice: { id, invoiceNumber }, emailSent }.
function OrderConfirmation({ result, email }) {
  const { order, invoice, emailSent } = result;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // The user was further down, at the Pay button. The address does not change, so the site's
  // ScrollToTop (SCRUM-104) does not run; scroll up here so "Thank you" is the first thing seen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadInvoicePdf(invoice);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="checkout-page">
      <div className="container checkout-confirmation">
        <header className="checkout-header">
          <p className="eyebrow">Order confirmed</p>
          <h1 className="checkout-title">
            Thank you, your order is <em>placed.</em>
          </h1>
          <p className="checkout-confirmation-lead">
            <CheckCircle2 size={20} strokeWidth={1.5} />
            Order #{order.id} · {formatOrderDate(order.createdAt)} · <OrderStatusPill status={order.status} />
          </p>
        </header>

        <div className="card checkout-panel checkout-receipt">
          <ul className="checkout-summary-items" aria-label="Items you bought">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name} <span className="muted">× {item.quantity}</span>
                </span>
                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary-total">
            <span>Total paid</span>
            <span>{formatPrice(order.total)}</span>
          </div>

          <dl className="checkout-receipt-details">
            <div>
              <dt className="checkout-label">Deliver to</dt>
              <dd>{order.deliveryAddress}</dd>
            </div>
            <div>
              <dt className="checkout-label">Paid with</dt>
              <dd>Card ending {order.cardLast4}</dd>
            </div>
            <div>
              <dt className="checkout-label">Invoice</dt>
              <dd>{invoice.invoiceNumber}</dd>
            </div>
          </dl>

          {/* A failed email never cancels the order (docs/API.md); the PDF is always here. */}
          <p className="muted checkout-email-note">
            {emailSent
              ? `We emailed the invoice${email ? ` to ${email}` : ''}. You can also download it here.`
              : 'We could not email the invoice this time, but your order is placed. Download it here.'}
          </p>

          <div className="checkout-confirmation-actions">
            <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
              <Download size={16} strokeWidth={1.5} />
              {downloading ? 'Downloading…' : 'Download invoice (PDF)'}
            </button>
            <Link to={`/orders/${order.id}`} className="btn btn-secondary">
              View order
            </Link>
          </div>
          {downloadError && (
            <p className="field-error checkout-form-error" role="alert">
              {downloadError}
            </p>
          )}
          <Link to="/shop" className="text-link checkout-edit-cart">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
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
