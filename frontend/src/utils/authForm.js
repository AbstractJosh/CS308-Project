// Form rules for the login and register pages (SCRUM-20). Owner: Sezin.
// They repeat the backend rules of handbook 7.2 with the same messages, so the user sees
// a mistake before sending. The backend still checks everything again (handbook 4.1).
// Each validate function returns { field: message } with only the fields that are wrong.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email) {
  const value = email.trim();
  if (!value) return 'Email is required';
  if (!EMAIL_PATTERN.test(value) || value.length > 255) return 'Enter a valid email';
  return null;
}

// bcrypt only reads 72 bytes, and letters like ş take 2 bytes (same rule as the backend).
function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailMessage = emailError(email);
  if (emailMessage) errors.email = emailMessage;
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister({ name, email, password, taxId, homeAddress }) {
  const errors = {};

  const nameLength = name.trim().length;
  if (!nameLength) errors.name = 'Name is required';
  else if (nameLength < 2 || nameLength > 100) errors.name = 'Name must be 2 to 100 characters';

  const emailMessage = emailError(email);
  if (emailMessage) errors.email = emailMessage;

  if (!password) errors.password = 'Password is required';
  else if (password.length < 8 || password.length > 72) {
    errors.password = 'Password must be 8 to 72 characters';
  } else if (!/\p{L}/u.test(password)) errors.password = 'Password must contain a letter';
  else if (!/\d/.test(password)) errors.password = 'Password must contain a number';
  else if (byteLength(password) > 72) {
    errors.password = 'Password is too long: letters like ş count as 2 of the 72 characters';
  }

  if (!taxId) errors.taxId = 'Tax ID is required';
  else if (!/^\d{10,11}$/.test(taxId)) errors.taxId = 'Tax ID must be 10 or 11 digits';

  const addressLength = homeAddress.trim().length;
  if (!addressLength) errors.homeAddress = 'Home address is required';
  else if (addressLength < 10 || addressLength > 300) {
    errors.homeAddress = 'Home address must be 10 to 300 characters';
  }

  return errors;
}

// Turns the API error from login() or register() into messages for the form:
// validation details go next to their fields, everything else above the button.
export function serverErrors(err) {
  if (Array.isArray(err.details) && err.details.length > 0) {
    const fields = {};
    for (const { field, message } of err.details) fields[field] ??= message;
    return { fields, form: '' };
  }
  // 409 "An account with this email already exists" belongs to the email field.
  if (err.status === 409) return { fields: { email: err.message }, form: '' };
  return { fields: {}, form: err.message };
}

// Where to go after login: ?redirect=/checkout from ProtectedRoute or the cart (handbook 7.3).
// Only paths inside this site are allowed, so a link like ?redirect=https://evil.example
// or ?redirect=//evil.example cannot send the user to another website.
export function safeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/\\')) return '/';
  // Going "back" to the login or register page after logging in would loop forever.
  if (/^\/(login|register)(?=$|[/?#])/.test(value)) return '/';
  return value;
}
