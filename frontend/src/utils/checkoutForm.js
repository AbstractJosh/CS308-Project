// Form rules for the checkout page (SCRUM-53). Owner: Sezin.
// The card rules and messages are the ones in docs/API.md ("card in the body of POST /checkout"),
// so the user sees a mistake before paying. The backend still checks everything again.
// Each validate function returns { field: message } with only the fields that are wrong.

const onlyDigits = (text) => String(text ?? '').replace(/\D/g, '');

// "4242424242424242" -> "4242 4242 4242 4242" while typing; at most 19 digits.
export function formatCardNumber(value) {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

// "1129" -> "11/29" while typing; at most 4 digits.
// A pasted or autofilled date with a 4-digit year becomes MM/YY too (SCRUM-111):
// "11/2029", "1/2029", "11-2029", "112029" and "2029-11" all become "11/29".
export function formatExpiry(value) {
  const text = String(value ?? '').trim();
  const monthFirst = /^(\d{1,2})\s*[/.-]?\s*(20\d{2})$/.exec(text);
  const yearFirst = /^(20\d{2})\s*[/.-]\s*(\d{1,2})$/.exec(text);
  const full = monthFirst ? [monthFirst[1], monthFirst[2]] : yearFirst ? [yearFirst[2], yearFirst[1]] : null;
  if (full && Number(full[0]) >= 1 && Number(full[0]) <= 12) {
    return `${full[0].padStart(2, '0')}/${full[1].slice(2)}`;
  }

  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

// Luhn check: every second digit from the right is doubled; the sum must end in 0.
// It catches most typing mistakes in a card number (handbook 7.4).
export function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return digits.length > 0 && sum % 10 === 0;
}

// "11/29" -> { month: 11, year: 2029 }; null when it is not a real MM/YY.
export function parseExpiry(value) {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(match[2]) };
}

export function validateAddress(address) {
  const length = String(address ?? '').trim().length;
  if (!length) return { deliveryAddress: 'Delivery address is required' };
  if (length < 10 || length > 300) {
    return { deliveryAddress: 'Delivery address must be 10 to 300 characters' };
  }
  return {};
}

// card = { holderName, number, expiry: "MM/YY", cvv }. today is a parameter so tests can fix it.
export function validateCard(card, today = new Date()) {
  const errors = {};

  const nameLength = card.holderName.trim().length;
  if (!nameLength) errors.holderName = 'Name on card is required';
  else if (nameLength < 2 || nameLength > 100) errors.holderName = 'Name on card must be 2 to 100 characters';

  const number = onlyDigits(card.number);
  if (!number) errors.number = 'Card number is required';
  else if (number.length < 13 || number.length > 19 || !passesLuhn(number)) {
    errors.number = 'Enter a valid card number';
  }

  if (!card.expiry.trim()) errors.expiry = 'Expiry date is required';
  else {
    const expiry = parseExpiry(card.expiry);
    if (!expiry) errors.expiry = 'Enter the expiry date as MM/YY';
    else {
      // A card is valid until the end of its month: 11/26 works all of November 2026.
      const thisMonth = today.getFullYear() * 12 + today.getMonth();
      if (expiry.year * 12 + (expiry.month - 1) < thisMonth) errors.expiry = 'This card has expired';
    }
  }

  if (!card.cvv) errors.cvv = 'CVV is required';
  else if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = 'CVV must be 3 or 4 digits';

  return errors;
}

// The body of POST /checkout (handbook 8.3, docs/API.md):
// { deliveryAddress, card: { number, holderName, expiryMonth, expiryYear, cvv } }
export function checkoutBody(deliveryAddress, card) {
  const expiry = parseExpiry(card.expiry);
  return {
    deliveryAddress: deliveryAddress.trim(),
    card: {
      number: onlyDigits(card.number),
      holderName: card.holderName.trim(),
      expiryMonth: expiry.month,
      expiryYear: expiry.year,
      cvv: card.cvv,
    },
  };
}

// The API names card fields "card.number", "card.expiryMonth" ... (docs/API.md).
// This turns them into the names of the form fields.
const API_FIELDS = {
  deliveryAddress: 'deliveryAddress',
  'card.number': 'number',
  'card.holderName': 'holderName',
  'card.expiryMonth': 'expiry',
  'card.expiryYear': 'expiry',
  'card.cvv': 'cvv',
};

export function checkoutServerErrors(err) {
  const fields = {};
  for (const { field, message } of err.details ?? []) {
    const name = API_FIELDS[field];
    if (name) fields[name] ??= message;
  }
  if (Object.keys(fields).length) return { fields, form: '' };
  // 402: the bank said no. Nothing was saved, so the user can simply try another card.
  const form = err.status === 402 ? `${err.message}. You can try another card.` : err.message;
  return { fields, form };
}
