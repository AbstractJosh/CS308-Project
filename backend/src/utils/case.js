// "quantity_in_stock" -> "quantityInStock"
export function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

// Turns the keys of one database row into camelCase.
// Anything that is not a plain object (numbers, dates, null) is returned unchanged.
export function rowToCamel(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const proto = Object.getPrototypeOf(row);
  if (proto !== Object.prototype && proto !== null) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) out[snakeToCamel(key)] = value;
  return out;
}
