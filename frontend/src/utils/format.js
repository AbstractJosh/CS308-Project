const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TRY',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// 12499 -> "₺12,499.00". Prices from the API are numbers; strings are accepted too.
export function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

// Stock text for cards and the product page (handbook 7.1):
// 0 -> "Sold out", 1 to 5 -> "Only N left", otherwise "N in stock".
export function stockLabel(qty) {
  const n = Number(qty) || 0;
  if (n <= 0) return { text: 'Sold out', tone: 'out' };
  if (n <= 5) return { text: `Only ${n} left`, tone: 'low' };
  return { text: `${n} in stock`, tone: 'ok' };
}
