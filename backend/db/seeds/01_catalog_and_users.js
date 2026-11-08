// SCRUM-12 (Murat): demo data from handbook Appendix A and section 6.4.
// Run with: npm run db:seed (safe to run many times).
import bcrypt from 'bcryptjs';

const W2 = '2 years manufacturer warranty';
const NW = 'No warranty';
const NWC = 'No warranty (consumable)';
const official = (brand) => `${brand} official distributor`;

// 13.1: insert in this order.
export const categories = [
  { name: 'Espresso Machines', slug: 'espresso-machines', description: 'Barista-style espresso machines where you grind, tamp and steam milk yourself.' },
  { name: 'Fully Automatic Machines', slug: 'automatic-machines', description: 'Bean-to-cup machines that grind, brew and froth milk at the press of a button.' },
  { name: 'Filter Coffee Machines', slug: 'filter-machines', description: 'Drip brewers for easy batch coffee, some with a built-in grinder or thermal jug.' },
  { name: 'Turkish Coffee Machines', slug: 'turkish-coffee-machines', description: 'Machines that brew Turkish coffee with foam.' },
  { name: 'French Press & Moka Pot', slug: 'french-press-moka', description: 'Manual brewers for the stove top or the kettle.' },
  { name: 'Professional Machines', slug: 'professional-machines', description: 'High-capacity machines for offices, cafes and restaurants.' },
  { name: 'Coffee', slug: 'coffee', description: 'Espresso, filter and Turkish coffee, as beans or ground.' },
  { name: 'Grinders', slug: 'grinders', description: 'Electric and manual grinders for espresso, filter and Turkish coffee.' },
  { name: 'Coffee Serving', slug: 'coffee-serving', description: 'Glasses, milk jugs, frothers and thermoses.' },
  { name: 'Care & Accessories', slug: 'care-accessories', description: 'Cleaning and descaling products, water filters, tampers and milk jugs.' },
];

// One product per line, in the column order of Appendix A:
// serial number, name, category slug, model, stock, price (TRY),
// warranty status, distributor, number of photos, popularity, description.
function product(serial, name, categorySlug, model, stock, price, warranty, distributor, imageCount, popularity, description) {
  return {
    serial_number: serial,
    name,
    categorySlug,
    model,
    quantity_in_stock: stock,
    price,
    warranty_status: warranty,
    distributor,
    image_count: imageCount,
    popularity,
    description,
  };
}

// 13.2: all 51 products. cost stays null (profit uses 50% of the price).
export const products = [
  // Espresso Machines (8)
  product('CRM-EM-1001', 'Sage The Barista Touch Impress', 'espresso-machines', 'SES881 BSS', 4, 209999, W2, official('Sage'), 8, 41, 'Espresso machine with a built-in grinder, assisted tamping and a touchscreen for guided drinks.'),
  product('CRM-EM-1002', 'Sage The Barista Touch', 'espresso-machines', 'SES880 BSS', 6, 99999, W2, official('Sage'), 8, 63, 'Espresso machine with a built-in grinder, touchscreen controls and automatic milk texturing.'),
  product('CRM-EM-1003', 'Sage The Barista Express Impress', 'espresso-machines', 'SES876 BSS', 9, 99999, W2, official('Sage'), 8, 188, 'Espresso machine with a built-in grinder and assisted tamping.'),
  product('CRM-EM-1004', 'Sage The Barista Pro', 'espresso-machines', 'SES878 BSS', 5, 142999, W2, official('Sage'), 8, 37, 'Espresso machine with a built-in grinder, fast heat-up and an LCD display.'),
  product('CRM-EM-1005', 'Sage The Bambino Plus', 'espresso-machines', 'SES500 BSS', 12, 49999, W2, official('Sage'), 8, 152, 'Compact espresso machine with fast heat-up and automatic milk frothing.'),
  product('CRM-EM-1006', 'Sage The Oracle Jet', 'espresso-machines', 'SES985', 2, 329999, W2, official('Sage'), 7, 18, 'Espresso machine that grinds, doses and tamps automatically, with automatic milk texturing.'),
  product('CRM-EM-1007', 'Sage The Oracle Dual Boiler', 'espresso-machines', 'SES995', 0, 459999, W2, official('Sage'), 8, 9, 'Dual boiler espresso machine with automatic grinding, dosing and tamping.'),
  product('CRM-EM-1008', 'Caso Gourmet Latte', 'espresso-machines', 'Gourmet Latte', 15, 14999, W2, official('Caso'), 8, 97, 'Entry-level espresso machine with a milk system for lattes and cappuccinos.'),

  // Fully Automatic Machines (9)
  product('CRM-AM-2001', 'Jura E6 Piano Black', 'automatic-machines', 'E6 (EC)', 7, 79999, W2, official('Jura'), 4, 85, 'Fully automatic bean-to-cup machine for espresso, coffee and milk drinks.'),
  product('CRM-AM-2002', 'Jura C9 Piano Black', 'automatic-machines', 'C9 (EA)', 5, 164999, W2, official('Jura'), 8, 44, 'Fully automatic bean-to-cup machine with one-touch milk drinks.'),
  product('CRM-AM-2003', 'Jura S8 Piano Black', 'automatic-machines', 'S8 (EB)', 3, 274999, W2, official('Jura'), 8, 27, 'Fully automatic bean-to-cup machine with a touchscreen and a wide drink menu.'),
  product('CRM-AM-2004', 'Jura J10 Piano Black', 'automatic-machines', 'J10 (EA)', 3, 308999, W2, official('Jura'), 7, 21, 'Fully automatic bean-to-cup machine that also makes cold-extracted coffee.'),
  product('CRM-AM-2005', 'KitchenAid KF6 Cast Iron Black', 'automatic-machines', '5KES8556EBK', 4, 119999, W2, official('KitchenAid'), 8, 33, 'Fully automatic espresso machine with a built-in grinder and milk system.'),
  product('CRM-AM-2006', 'KitchenAid KF6 Brushed Stainless Steel', 'automatic-machines', '5KES8556ESX', 4, 119999, W2, official('KitchenAid'), 7, 29, 'Fully automatic espresso machine with a built-in grinder and milk system.'),
  product('CRM-AM-2007', 'KitchenAid KF7 Juniper', 'automatic-machines', '5KES8557EJP', 3, 139999, W2, official('KitchenAid'), 8, 17, 'Fully automatic espresso machine with a built-in grinder and a larger drink menu.'),
  product('CRM-AM-2008', 'KitchenAid KF7 Brushed Stainless Steel', 'automatic-machines', '5KES8557ESX', 3, 139999, W2, official('KitchenAid'), 8, 15, 'Fully automatic espresso machine with a built-in grinder and a larger drink menu.'),
  product('CRM-AM-2009', 'KitchenAid KF8 Juniper', 'automatic-machines', '5KES8558EJP', 2, 119999, W2, official('KitchenAid'), 7, 12, 'Fully automatic espresso machine, the top model of the KF range.'),

  // Filter Coffee Machines (6)
  product('CRM-FM-3001', 'Caso Aroma Sense', 'filter-machines', '1851', 10, 23999, W2, official('Caso'), 5, 58, 'Filter coffee machine with adjustable brewing strength.'),
  product('CRM-FM-3002', 'Caso Filter Machine with Grinder', 'filter-machines', '1848', 8, 24999, W2, official('Caso'), 8, 46, 'Filter coffee machine with a built-in grinder for fresh beans every time.'),
  product('CRM-FM-3003', 'Caso Selection C10 Thermo', 'filter-machines', 'C10', 14, 14999, W2, official('Caso'), 4, 71, 'Filter coffee machine with a thermal jug that keeps coffee hot without a hot plate.'),
  product('CRM-FM-3004', 'KitchenAid Filter Machine Empire Red', 'filter-machines', '5KCM1209EER', 9, 15999, W2, official('KitchenAid'), 6, 39, 'Drip filter coffee machine with a glass carafe.'),
  product('CRM-FM-3005', 'KitchenAid Filter Machine Almond Cream', 'filter-machines', '5KCM1209EAC', 9, 15999, W2, official('KitchenAid'), 4, 35, 'Drip filter coffee machine with a glass carafe.'),
  product('CRM-FM-3006', 'WMF Kitchenminis Filter Machine', 'filter-machines', 'Kitchenminis Glass', 18, 12999, W2, official('WMF'), 8, 66, 'Compact filter coffee machine with a glass carafe for small kitchens.'),

  // Turkish Coffee Machines (1)
  product('CRM-TK-4001', 'Leggno Gourmet Pro Turkish Coffee Machine Black', 'turkish-coffee-machines', 'Gourmet Pro', 20, 5499, W2, official('Leggno'), 3, 120, 'Turkish coffee machine that brews in the traditional way, with foam.'),

  // French Press & Moka Pot (4)
  product('CRM-FP-5001', 'Bialetti Moka Express 1 Cup', 'french-press-moka', 'Moka Express 1', 30, 1799, NW, official('Bialetti'), 7, 156, 'Classic aluminium stovetop moka pot for one cup.'),
  product('CRM-FP-5002', 'Bialetti Rainbow Moka Pot 3 Cup Light Blue', 'french-press-moka', 'Rainbow 3', 16, 2299, NW, official('Bialetti'), 4, 88, 'Coloured aluminium stovetop moka pot for three cups.'),
  product('CRM-FP-5003', 'Bialetti French Press 350 ml Black', 'french-press-moka', 'Smart 350 ml', 0, 2299, NW, official('Bialetti'), 4, 61, 'Glass French press for about two cups.'),
  product('CRM-FP-5004', 'Bialetti Smart French Press 1 L Black', 'french-press-moka', 'Smart 1 L', 12, 2199, NW, official('Bialetti'), 3, 54, 'Glass French press for about four mugs.'),

  // Professional Machines (2)
  product('CRM-PM-6001', 'Jura GIGA X8c Aluminum Black', 'professional-machines', 'GIGA X8c', 1, 959999, W2, official('Jura'), 8, 4, 'Professional fully automatic machine with high daily capacity for offices and cafes.'),
  product('CRM-PM-6002', 'Jura X10 Dark Inox', 'professional-machines', 'X10 (EA)', 2, 361999, W2, official('Jura'), 7, 7, 'Professional fully automatic machine for small offices and meeting rooms.'),

  // Coffee (6)
  product('CRM-CF-7001', 'Hola Sol Espresso Italiano Beans 250 g', 'coffee', 'Espresso Italiano 250 g', 45, 549, NWC, official('Hola Sol'), 3, 175, 'Whole bean espresso coffee, 250 g.'),
  product('CRM-CF-7002', 'Hola Sol Adicto Filter Beans 1 kg', 'coffee', 'Adicto 1000 g', 25, 1589, NWC, official('Hola Sol'), 3, 132, 'Whole bean coffee for filter brewing, 1 kg.'),
  product('CRM-CF-7003', 'Coach Coffee Colombia Huila Lucero Beans 250 g', 'coffee', 'Huila Lucero 250 g', 20, 520, NWC, official('Coach Coffee'), 5, 96, 'Single origin whole bean coffee from Huila, Colombia, 250 g.'),
  product('CRM-CF-7004', 'Hola Sol Turkish Coffee 250 g', 'coffee', 'Turkish Coffee 250 g', 80, 279, NWC, official('Hola Sol'), 3, 210, 'Finely ground Turkish coffee, 250 g.'),
  product('CRM-CF-7005', 'Hola Sol Perla Nera Beans 250 g', 'coffee', 'Perla Nera 250 g', 30, 699, NWC, official('Hola Sol'), 3, 74, 'Whole bean espresso coffee, 250 g.'),
  product('CRM-CF-7006', 'Kahve Fabrikası Holy Shot Espresso Blend 250 g', 'coffee', 'Holy Shot 250 g', 0, 339, NWC, official('Kahve Fabrikası'), 1, 58, 'Whole bean espresso blend, 250 g.'),

  // Grinders (4)
  product('CRM-GR-8001', 'Sage The Smart Grinder Pro', 'grinders', 'BCG820', 8, 36999, W2, official('Sage'), 8, 69, 'Electric burr grinder with many grind settings and dose control.'),
  product('CRM-GR-8002', 'Caso Barista Flavour Grinder', 'grinders', '1832', 10, 17999, W2, official('Caso'), 8, 52, 'Electric burr grinder for espresso and filter coffee.'),
  product('CRM-GR-8003', 'KitchenAid Artisan Burr Grinder Medallion Silver', 'grinders', '5KCG8433EMS', 6, 14999, W2, official('KitchenAid'), 3, 31, 'Electric burr grinder with a digital display.'),
  product('CRM-GR-8004', 'Zassenhaus Manaos Hand Grinder', 'grinders', 'Manaos', 14, 4199, NW, official('Zassenhaus'), 4, 77, 'Manual coffee grinder with a hand crank.'),

  // Coffee Serving (5)
  product('CRM-SV-9001', 'WMF Kineo Latte Macchiato Set of 2', 'coffee-serving', 'Kineo', 25, 1899, NW, official('WMF'), 3, 64, 'Two double-wall glasses for latte macchiato.'),
  product('CRM-SV-9002', 'WMF Cappuccino Glass Set of 2', 'coffee-serving', 'Cappuccino 2-pack', 30, 1499, NW, official('WMF'), 3, 48, 'Two glass cappuccino cups.'),
  product('CRM-SV-9003', 'Kela Fontana Glass Milk Jug 700 ml', 'coffee-serving', 'Fontana 700 ml', 18, 1999, NW, official('Kela'), 3, 39, 'Glass milk jug, 700 ml.'),
  product('CRM-SV-9004', 'Bialetti Milk and Cappuccino Frother 3 Cup Black', 'coffee-serving', 'Frother 3 Cup', 15, 1999, NW, official('Bialetti'), 1, 57, 'Stovetop milk frother for cappuccino.'),
  product('CRM-SV-9005', 'Bialetti Thermos 750 ml Grey', 'coffee-serving', 'Thermos 750 ml', 22, 1799, NW, official('Bialetti'), 1, 43, 'Insulated thermos bottle, 750 ml.'),

  // Care & Accessories (6)
  product('CRM-AC-9501', 'Jura Stainless Steel Milk Pipe HP2', 'care-accessories', 'HP2', 20, 3199, NW, official('Jura'), 1, 22, 'Replacement stainless steel milk pipe for Jura machines.'),
  product('CRM-AC-9502', 'Jura 3-Phase Cleaning Tablets 25 pcs', 'care-accessories', '25 tablets', 40, 5299, NWC, official('Jura'), 1, 63, 'Cleaning tablets for Jura fully automatic machines, 25 pieces.'),
  product('CRM-AC-9503', 'Sage Descaler 4-pack', 'care-accessories', 'SES007', 35, 3199, NWC, official('Sage'), 1, 70, 'Descaling sachets for Sage espresso machines, pack of 4.'),
  product('CRM-AC-9504', 'Jura Claris Smart+ Water Filter', 'care-accessories', 'Claris Smart+', 30, 2499, NWC, official('Jura'), 3, 84, 'Water filter cartridge for Jura machines.'),
  product('CRM-AC-9505', 'Sage The Force Gauge Tamper 58 mm', 'care-accessories', 'Force Gauge 58 mm', 8, 15999, NW, official('Sage'), 5, 26, 'Tamper with a force gauge for even pressure, 58 mm.'),
  product('CRM-AC-9506', 'Sage The Pro Control Jug', 'care-accessories', 'Pro Control Jug', 16, 6299, NW, official('Sage'), 4, 47, 'Stainless steel milk jug for latte art.'),
];

// 6.4: one demo account per role.
export const DEMO_PASSWORD = 'Demo1234';
export const demoUsers = [
  { email: 'customer@crema.com', name: 'Demo Customer', role: 'CUSTOMER' },
  { email: 'pm@crema.com', name: 'Product Manager', role: 'PRODUCT_MANAGER' },
  { email: 'sales@crema.com', name: 'Sales Manager', role: 'SALES_MANAGER' },
  { email: 'support@crema.com', name: 'Support Agent', role: 'SUPPORT_AGENT' },
];
const DEMO_TAX_ID = '1234567890';
const DEMO_ADDRESS = 'Sabancı University, Orta Mahalle, Tuzla, İstanbul';

export async function seed(knex) {
  // Children first, because they point to the tables after them.
  // From Sprint 2, delete invoices, payments, deliveries, order_items and orders here first.
  await knex('cart_items').del();
  await knex('carts').del();
  await knex('products').del();
  await knex('categories').del();

  const insertedCategories = await knex('categories').insert(categories).returning(['id', 'slug']);
  const categoryIdBySlug = Object.fromEntries(insertedCategories.map((c) => [c.slug, c.id]));

  await knex('products').insert(
    products.map(({ categorySlug, ...row }) => ({ ...row, category_id: categoryIdBySlug[categorySlug] })),
  );

  // Users are not deleted (they may have carts or orders); running the seed
  // again only makes sure each demo account has the right role.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await knex('users')
    .insert(
      demoUsers.map((user) => ({
        ...user,
        password_hash: passwordHash,
        tax_id: DEMO_TAX_ID,
        home_address: DEMO_ADDRESS,
      })),
    )
    .onConflict('email')
    .merge(['role']);
}
