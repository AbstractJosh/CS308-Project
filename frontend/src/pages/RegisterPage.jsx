import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { safeRedirect, serverErrors, validateRegister } from '../utils/authForm.js';
import './AuthPage.css';

// Register page, route /register (handbook 9.8). Owner: Sezin (SCRUM-20).
// Customer fields from requirement 14: name, email, password, tax ID, home address.
// The API always creates a CUSTOMER account (handbook 7.2), so there is no role field.
const EMPTY_FORM = { name: '', email: '', password: '', taxId: '', homeAddress: '' };

export default function RegisterPage() {
  const { user, register } = useAuth();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [apiErrors, setApiErrors] = useState({ fields: {}, form: '' });
  const [sending, setSending] = useState(false);

  // Logged in (also right after creating the account): go where the user wanted to be.
  if (user) return <Navigate to={redirect} replace />;

  // Mistakes show only after the first try, then update while the user types.
  const errors = { ...(submitted ? validateRegister(form) : {}), ...apiErrors.fields };

  function handleChange(event) {
    const { name } = event.target;
    // The tax ID is only digits, so other characters are not typed at all.
    const value = name === 'taxId' ? event.target.value.replace(/\D/g, '') : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    // Remove the server's message for this field (see LoginPage for why the key is removed).
    setApiErrors(({ fields: { [name]: _old, ...otherFields } }) => ({ fields: otherFields, form: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateRegister(form)).length > 0) return;

    setSending(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        taxId: form.taxId,
        homeAddress: form.homeAddress.trim(),
      });
      notify('Your account is ready. Welcome to Crema & Co.!');
    } catch (err) {
      setApiErrors(serverErrors(err));
      setSending(false);
    }
  }

  const loginLink = redirect === '/' ? '/login' : `/login?redirect=${encodeURIComponent(redirect)}`;

  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">New here</p>
          <h1>
            Create your <em>account.</em>
          </h1>
          <p className="auth-lead">
            One account for ordering, invoices and your order history. Your tax ID and home
            address go on your invoices and deliveries.
          </p>
        </div>

        <div className="card auth-card">
          <h2 className="auth-title">Create account</h2>

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              id="name"
              label="Full name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
            />
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
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              hint="8 to 72 characters, with at least one letter and one number."
            />
            <FormField
              id="taxId"
              label="Tax ID"
              inputMode="numeric"
              maxLength={11}
              value={form.taxId}
              onChange={handleChange}
              error={errors.taxId}
              hint="10 or 11 digits."
            />
            <FormField
              id="homeAddress"
              label="Home address"
              as="textarea"
              rows={3}
              autoComplete="street-address"
              value={form.homeAddress}
              onChange={handleChange}
              error={errors.homeAddress}
            />

            {apiErrors.form && (
              <p className="field-error auth-form-error" role="alert">
                {apiErrors.form}
              </p>
            )}

            <button type="submit" className="btn btn-primary auth-submit" disabled={sending}>
              {sending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch muted">
            Already have an account?{' '}
            <Link to={loginLink} className="text-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
