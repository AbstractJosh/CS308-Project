const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

export function formatOrderDate(value) {
  return dateFormatter.format(new Date(value));
}
