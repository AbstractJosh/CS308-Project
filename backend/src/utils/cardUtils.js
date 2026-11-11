// Sprint 2 (Ulukan): small pure helpers for the card rules in docs/API.md "Fake bank rules".
// Nothing here runs a query, so every function can be unit tested without a database.
// The zod schema (validators.js) and the fake bank (bank.service.js) both use these.

// A form shows the number in groups ("4242 4242 4242 4242"); the rules apply to the digits.
export function cardDigits(number) {
  return String(number).replace(/\s/g, '');
}

// 13 to 19 digits that pass the Luhn check. Takes the number without spaces.
// Luhn: from the right, double every second digit (minus 9 when that is above 9);
// the sum of all digits must end in 0. It catches a mistyped digit, not a fake card.
export function isValidCardNumber(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// A card works until the end of its expiry month, by the server's date.
// month is 1 to 12 and year has 4 digits; `now` is only passed by tests.
export function isCardExpired(month, year, now = new Date()) {
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  return year < thisYear || (year === thisYear && month < thisMonth);
}
