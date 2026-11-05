// Sample data for the prototype. Everything lives in memory and resets on page refresh.

export const fmt = (n) => (n < 0 ? '−₺' : '₺') + Math.round(Math.abs(n)).toLocaleString('en-US');
export const fmt2 = (n) => '₺' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
export const daysSince = (iso) => Math.floor((Date.parse(todayISO()) - Date.parse(iso)) / 864e5);
export const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDay = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// price is the list price set by the sales manager (null = not on sale yet); discount is a percentage.
export const priceOf = (p) => (p.price == null ? null : Math.round(p.price * (1 - (p.discount || 0) / 100)));
// Cost defaults to 50% of the sale price unless the product manager entered one.
export const costText = (p) => (p.cost ? fmt(p.cost) : p.price != null ? fmt(priceOf(p) / 2) + ' (50%)' : '50% of price');
export const orderTotal = (o) => o.items.reduce((a, i) => a + i.price * i.qty, 0) + (o.ship || 0);

export function totals(lines) {
  const list = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  const total = lines.reduce((a, l) => a + priceOf(l.p) * l.qty, 0);
  const ship = total === 0 || total >= 1000 ? 0 : 89;
  return { list, saved: list - total, ship, total: total + ship };
}

export const STATUS = {
  processing: { label: 'Processing', cls: 'warn' },
  'in-transit': { label: 'In transit', cls: 'info' },
  delivered: { label: 'Delivered', cls: 'ok' },
  cancelled: { label: 'Cancelled', cls: 'muted' },
};

export const CATEGORIES = [
  { id: 'beans', name: 'Coffee beans' },
  { id: 'machines', name: 'Espresso machines' },
  { id: 'grinders', name: 'Grinders' },
  { id: 'brewing', name: 'Brewing & accessories' },
  { id: 'gifts', name: 'Gift sets' },
];

const GC = 'Anatolia Green Coffee';
const EQ = 'Bosphorus Brew Equipment';
const bean = { warranty: 'No warranty', dist: GC };
export const PRODUCTS = [
  { id: 'P-1001', name: 'Ethiopia Yirgacheffe 250 g', cat: 'beans', desc: 'Washed, light roast. Jasmine, bergamot and lemon.', price: 520, stock: 34, sold: 980, rating: 4.8, ratings: 126, model: 'YRG-250', serial: 'LOT-261014', wish: 14, ...bean },
  { id: 'P-1002', name: 'Colombia Huila 250 g', cat: 'beans', desc: 'Medium roast. Red apple, caramel and cocoa.', price: 460, stock: 21, sold: 850, rating: 4.6, ratings: 94, model: 'HUI-250', serial: 'LOT-261007', wish: 9, ...bean },
  { id: 'P-1003', name: 'House Espresso Blend 1 kg', cat: 'beans', desc: 'Dark chocolate and hazelnut, made for milk drinks.', price: 1500, discount: 15, stock: 2, sold: 920, rating: 4.7, ratings: 211, model: 'HSE-1000', serial: 'LOT-261012', wish: 23, ...bean, dist: 'Own roastery' },
  { id: 'P-1004', name: 'Brazil Cerrado Decaf 250 g', cat: 'beans', desc: 'Decaf, medium roast. Peanut and milk chocolate.', price: 430, stock: 0, sold: 400, rating: 4.3, ratings: 37, model: 'DEC-250', serial: 'LOT-260921', wish: 4, ...bean },
  { id: 'P-1005', name: 'Crema One Espresso Machine', cat: 'machines', desc: 'Single boiler with PID temperature control, a 58 mm portafilter and a 2 L water tank.', price: 38900, cost: 22800, stock: 7, sold: 760, rating: 4.7, ratings: 38, model: 'CR-ONE-58', serial: 'CR1-26-004127', warranty: '2 years', dist: EQ, wish: 31 },
  { id: 'P-1006', name: 'Mill 64 Flat-Burr Grinder', cat: 'grinders', desc: 'Stepless grind adjustment from espresso to filter.', price: 14750, cost: 8900, stock: 12, sold: 700, rating: 4.5, ratings: 52, model: 'M64-FB', serial: 'M64-26-01188', warranty: '2 years', dist: EQ, wish: 18 },
  { id: 'P-1007', name: 'Glass Pour-Over Set', cat: 'brewing', desc: 'Dripper, carafe and 100 paper filters.', price: 1180, stock: 25, sold: 660, rating: 4.4, ratings: 71, model: 'POS-02', serial: 'POS-26-3302', warranty: '1 year', dist: EQ, wish: 6 },
  { id: 'P-1008', name: 'Gooseneck Kettle 0.9 L', cat: 'brewing', desc: 'Stainless steel kettle for a slow, precise pour.', price: 2650, stock: 9, sold: 540, rating: 4.6, ratings: 45, model: 'GK-090', serial: 'GK-26-0715', warranty: '1 year', dist: EQ, wish: 11 },
  { id: 'P-1009', name: 'Precision Scale with Timer', cat: 'brewing', desc: 'Weighs to 0.1 g with a built-in shot timer.', price: 1690, stock: 15, sold: 480, rating: 4.5, ratings: 33, model: 'SC-2K', serial: 'SC-26-0420', warranty: '1 year', dist: EQ, wish: 5 },
  { id: 'P-1010', name: 'Hand Grinder H1', cat: 'grinders', desc: 'Steel conical burrs, about 30 seconds per cup.', price: 3250, stock: 18, sold: 590, rating: 4.4, ratings: 61, model: 'H1-38', serial: 'H1-26-0907', warranty: '1 year', dist: EQ, wish: 7 },
  { id: 'P-1011', name: 'Cold Brew Bottle 1 L', cat: 'brewing', desc: 'Glass bottle with a fine mesh filter for overnight cold brew.', price: null, cost: 300, stock: 40, sold: 0, rating: 0, ratings: 0, model: 'CB-1000', serial: 'CB-26-0001', warranty: '1 year', dist: EQ, wish: 0 },
];

const cust = (id, name, email, address, taxId, card) => ({ id, name, email, address, taxId, card });
export const DENIZ = cust('C-0042', 'Deniz Yılmaz', 'deniz.yilmaz@example.com', 'Moda Cad. No:12 D:4, Kadıköy, 34710 İstanbul', '1234567890', '4242');
const BURAK = cust('C-0057', 'Burak Çelik', 'burak.celik@example.com', 'Atatürk Blv. No:45, Çankaya, 06420 Ankara', '2345678901', '0715');
const SELIN = cust('C-0031', 'Selin Arslan', 'selin.arslan@example.com', '1453 Sk. No:8, Konak, 35220 İzmir', '3456789012', '5521');
const MERT = cust('C-0024', 'Mert Aydın', 'mert.aydin@example.com', 'Barbaros Blv. No:3, Beşiktaş, 34353 İstanbul', '4567890123', '9034');
const ELIF = cust('C-0019', 'Elif Kaya', 'elif.kaya@example.com', 'Cumhuriyet Cad. No:21, Nilüfer, 16140 Bursa', '5678901234', '1881');
const ALI = cust('C-0063', 'Ali Şahin', 'ali.sahin@example.com', 'İnönü Cad. No:7, Muratpaşa, 07040 Antalya', '6789012345', '3307');
export const CUSTOMERS = [DENIZ, BURAK, SELIN, MERT, ELIF, ALI];

const line = (pid, qty, price, extra) => ({ pid, name: PRODUCTS.find((p) => p.id === pid).name, qty, price, ...extra });
export const SEED_ORDERS = [
  { id: 'CR-10436', customer: BURAK, date: '2026-10-27', status: 'processing', card: '0715', items: [line('P-1007', 1, 1180), line('P-1008', 1, 2650)] },
  { id: 'CR-10391', customer: DENIZ, date: '2026-10-24', status: 'in-transit', card: '4242', items: [line('P-1006', 1, 14750)] },
  { id: 'CR-10344', customer: SELIN, date: '2026-10-22', status: 'in-transit', card: '5521', items: [line('P-1005', 1, 38900)] },
  { id: 'CR-10307', customer: ALI, date: '2026-10-19', status: 'delivered', deliveredOn: '2026-10-20', card: '3307', items: [line('P-1009', 1, 1690, { ret: 'refunded' })] },
  { id: 'CR-10233', customer: DENIZ, date: '2026-10-12', status: 'delivered', deliveredOn: '2026-10-18', card: '4242', items: [line('P-1005', 1, 38900), line('P-1007', 1, 1180)] },
  { id: 'CR-10148', customer: MERT, date: '2026-10-05', status: 'delivered', deliveredOn: '2026-10-09', card: '9034', items: [line('P-1006', 1, 14750, { ret: 'requested' })] },
  { id: 'CR-10115', customer: ELIF, date: '2026-10-05', status: 'delivered', deliveredOn: '2026-10-09', card: '1881', items: [line('P-1002', 1, 391, { ret: 'awaiting', listPrice: 460 })] },
  { id: 'CR-09870', customer: DENIZ, date: '2026-08-02', status: 'delivered', deliveredOn: '2026-08-06', card: '4242', items: [line('P-1002', 1, 391, { review: 5, listPrice: 460 })] },
];

export const SEED_REFUNDS = [
  { id: 'RR-0029', orderId: 'CR-10148', customer: MERT, card: '9034', pid: 'P-1006', name: 'Mill 64 Flat-Burr Grinder', qty: 1, paid: 14750, bought: '2026-10-05', requested: '2026-10-28', reason: 'Squeaks when grinding fine (video sent to support)', state: 'pending' },
  { id: 'RR-0028', orderId: 'CR-10115', customer: ELIF, card: '1881', pid: 'P-1002', name: 'Colombia Huila 250 g', qty: 1, paid: 391, bought: '2026-10-05', requested: '2026-10-20', reason: 'Changed my mind, unopened', state: 'awaiting' },
  { id: 'RR-0027', orderId: 'CR-10307', customer: ALI, card: '3307', pid: 'P-1009', name: 'Precision Scale with Timer', qty: 1, paid: 1690, bought: '2026-10-19', requested: '2026-10-20', reason: 'Not as described', state: 'refunded' },
];

export const SEED_COMMENTS = [
  { id: 1, pid: 'P-1005', customer: 'Elif K.', date: '2026-10-21', stars: 5, text: 'Stable temperature, easy to dial in. Took a week to learn the steam wand.', state: 'approved' },
  { id: 2, pid: 'P-1005', customer: 'Mert A.', date: '2026-10-09', stars: 5, text: 'Upgraded from a pod machine. Worth it, but buy a good grinder too.', state: 'approved' },
  { id: 3, pid: 'P-1002', customer: 'Deniz Y.', date: '2026-08-10', stars: 5, text: 'Sweet and balanced as espresso.', state: 'approved' },
  { id: 4, pid: 'P-1007', customer: 'Can Ö.', date: '2026-10-28', stars: 2, text: 'The carafe is thinner than it looks in the photos. Brews fine but feels fragile.', state: 'pending' },
  { id: 5, pid: 'P-1009', customer: 'Zeynep D.', date: '2026-10-27', stars: 4, text: 'Accurate, and the timer is handy. Wish it were a bit smaller.', state: 'pending' },
  { id: 6, pid: 'P-1006', customer: 'Ali Ş.', date: '2026-10-15', stars: 1, text: 'Visit my site for cheaper grinders!!!', state: 'rejected' },
];

export const SEED_NOTES = [
  { id: 1, customerId: DENIZ.id, date: '2026-10-28', title: 'Price drop on your wishlist', body: 'House Espresso Blend 1 kg is now ₺1,275 (15% off).' },
  { id: 2, customerId: DENIZ.id, date: '2026-10-25', title: 'Order shipped', body: 'CR-10391 is on its way.' },
];

export const SEED_CHATS = [
  { id: DENIZ.id, name: DENIZ.name, customerId: DENIZ.id, claimed: true, started: 'orders', msgs: [
    { from: 'customer', text: 'My pour-over carafe arrived cracked. Can I send a photo?' },
    { from: 'agent', text: 'Of course, please attach it here.' },
    { from: 'customer', file: 'carafe-crack.jpg', text: 'Here it is.' },
  ] },
  { id: 'guest-4821', name: 'Guest #4821', guest: true, claimed: false, started: 'product/P-1005', msgs: [
    { from: 'customer', text: 'Is the Crema One quiet enough for an apartment?' },
  ] },
  { id: BURAK.id, name: BURAK.name, customerId: BURAK.id, claimed: false, started: 'shop', cart: ['Hand Grinder H1 × 1'], wish: [], msgs: [
    { from: 'customer', text: 'When will CR-10436 ship?' },
  ] },
  { id: MERT.id, name: MERT.name, customerId: MERT.id, claimed: false, started: 'orders', cart: [], wish: ['Gooseneck Kettle 0.9 L'], msgs: [
    { from: 'customer', file: 'grinder-noise.mp4', text: 'My grinder squeaks when grinding fine. Video attached.' },
  ] },
];
