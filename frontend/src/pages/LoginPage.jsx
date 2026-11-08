import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { FileText, Package, ShoppingBag } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { safeRedirect, serverErrors, validateLogin } from '../utils/authForm.js';
import './AuthPage.css';

// Login page, route /login (handbook 9.8). Owner: Sezin (SCRUM-20).
// /login?redirect=/checkout&reason=checkout sends the user back after logging in (handbook 7.3).
export default function LoginPage() {
  const { user, login } = useAuth();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const fromCheckout = params.get('reason') === 'checkout';

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitted, setSubmitted] = useState(false);
  const [apiErrors, setApiErrors] = useState({ fields: {}, form: '' });
  const [sending, setSending] = useState(false);

  // Logged in (also right after a successful login): go where the user wanted to be.
  if (user) return <Navigate to={redirect} replace />;

  // Mistakes show only after the first try, then update while the user types.
  const errors = { ...(submitted ? validateLogin(form) : {}), ...apiErrors.fields };

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    // The server's message for this field is about the old value, so remove it. (Removing the
    // key matters: an "undefined" left behind would hide this field's own form error.)
    setApiErrors(({ fields: { [name]: _old, ...otherFields } }) => ({ fields: otherFields, form: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateLogin(form)).length > 0) return;

    setSending(true);
    try {
      await login(form.email.trim(), form.password);
      notify('Welcome back! You are logged in.');
    } catch (err) {
      setApiErrors(serverErrors(err));
      setSending(false);
    }
  }

  // Keep ?redirect when the user switches to the register page.
  const registerLink = redirect === '/' ? '/register' : `/register?redirect=${encodeURIComponent(redirect)}`;

  return (
    <section className="container auth-page">
      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Your account</p>
          <h1>
            Welcome <em>back.</em>
          </h1>
          <p className="auth-lead">
            Log in to pay for your order, follow it from processing to delivered and see your
            invoices.
          </p>
          <ul className="auth-perks">
            <li>
              <ShoppingBag size={20} strokeWidth={1.5} /> Your cart is kept when you log in
            </li>
            <li>
              <Package size={20} strokeWidth={1.5} /> Order status from processing to delivered
            </li>
            <li>
              <FileText size={20} strokeWidth={1.5} /> Invoices on screen and by email
            </li>
          </ul>
        </div>

        <div className="card auth-card">
          <h2 className="auth-title">Log in</h2>
          {fromCheckout && (
            <p className="auth-notice" role="status">
              Please log in to continue to checkout.
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
            />

            {apiErrors.form && (
              <p className="field-error auth-form-error" role="alert">
                {apiErrors.form}
              </p>
            )}

            <button type="submit" className="btn btn-primary auth-submit" disabled={sending}>
              {sending ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch muted">
            New to Crema &amp; Co.?{' '}
            <Link to={registerLink} className="text-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
