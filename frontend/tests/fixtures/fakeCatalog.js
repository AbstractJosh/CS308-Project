const TIMESTAMP = '2026-11-05T00:00:00.000Z';

const rawCategories = [
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

const rawProducts = [
  ['CRM-EM-1001', 'Sage The Barista Touch Impress', 'espresso-machines', 'SES881 BSS', 4, 209999, '2 years manufacturer warranty', 'Sage official distributor', 8, 41, 'Espresso machine with a built-in grinder, assisted tamping and a touchscreen for guided drinks.'],
  ['CRM-EM-1002', 'Sage The Barista Touch', 'espresso-machines', 'SES880 BSS', 6, 99999, '2 years manufacturer warranty', 'Sage official distributor', 8, 63, 'Espresso machine with a built-in grinder, touchscreen controls and automatic milk texturing.'],
  ['CRM-EM-1003', 'Sage The Barista Express Impress', 'espresso-machines', 'SES876 BSS', 9, 99999, '2 years manufacturer warranty', 'Sage official distributor', 8, 188, 'Espresso machine with a built-in grinder and assisted tamping.'],
  ['CRM-EM-1004', 'Sage The Barista Pro', 'espresso-machines', 'SES878 BSS', 5, 142999, '2 years manufacturer warranty', 'Sage official distributor', 8, 37, 'Espresso machine with a built-in grinder, fast heat-up and an LCD display.'],
  ['CRM-EM-1005', 'Sage The Bambino Plus', 'espresso-machines', 'SES500 BSS', 12, 49999, '2 years manufacturer warranty', 'Sage official distributor', 8, 152, 'Compact espresso machine with fast heat-up and automatic milk frothing.'],
  ['CRM-EM-1006', 'Sage The Oracle Jet', 'espresso-machines', 'SES985', 2, 329999, '2 years manufacturer warranty', 'Sage official distributor', 7, 18, 'Espresso machine that grinds, doses and tamps automatically, with automatic milk texturing.'],
  ['CRM-EM-1007', 'Sage The Oracle Dual Boiler', 'espresso-machines', 'SES995', 0, 459999, '2 years manufacturer warranty', 'Sage official distributor', 8, 9, 'Dual boiler espresso machine with automatic grinding, dosing and tamping.'],
  ['CRM-EM-1008', 'Caso Gourmet Latte', 'espresso-machines', 'Gourmet Latte', 15, 14999, '2 years manufacturer warranty', 'Caso official distributor', 8, 97, 'Entry-level espresso machine with a milk system for lattes and cappuccinos.'],
  ['CRM-AM-2001', 'Jura E6 Piano Black', 'automatic-machines', 'E6 (EC)', 7, 79999, '2 years manufacturer warranty', 'Jura official distributor', 4, 85, 'Fully automatic bean-to-cup machine for espresso, coffee and milk drinks.'],
  ['CRM-AM-2002', 'Jura C9 Piano Black', 'automatic-machines', 'C9 (EA)', 5, 164999, '2 years manufacturer warranty', 'Jura official distributor', 8, 44, 'Fully automatic bean-to-cup machine with one-touch milk drinks.'],
  ['CRM-AM-2003', 'Jura S8 Piano Black', 'automatic-machines', 'S8 (EB)', 3, 274999, '2 years manufacturer warranty', 'Jura official distributor', 8, 27, 'Fully automatic bean-to-cup machine with a touchscreen and a wide drink menu.'],
  ['CRM-AM-2004', 'Jura J10 Piano Black', 'automatic-machines', 'J10 (EA)', 3, 308999, '2 years manufacturer warranty', 'Jura official distributor', 7, 21, 'Fully automatic bean-to-cup machine that also makes cold-extracted coffee.'],
  ['CRM-AM-2005', 'KitchenAid KF6 Cast Iron Black', 'automatic-machines', '5KES8556EBK', 4, 119999, '2 years manufacturer warranty', 'KitchenAid official distributor', 8, 33, 'Fully automatic espresso machine with a built-in grinder and milk system.'],
  ['CRM-AM-2006', 'KitchenAid KF6 Brushed Stainless Steel', 'automatic-machines', '5KES8556ESX', 4, 119999, '2 years manufacturer warranty', 'KitchenAid official distributor', 7, 29, 'Fully automatic espresso machine with a built-in grinder and milk system.'],
  ['CRM-AM-2007', 'KitchenAid KF7 Juniper', 'automatic-machines', '5KES8557EJP', 3, 139999, '2 years manufacturer warranty', 'KitchenAid official distributor', 8, 17, 'Fully automatic espresso machine with a built-in grinder and a larger drink menu.'],
  ['CRM-AM-2008', 'KitchenAid KF7 Brushed Stainless Steel', 'automatic-machines', '5KES8557ESX', 3, 139999, '2 years manufacturer warranty', 'KitchenAid official distributor', 8, 15, 'Fully automatic espresso machine with a built-in grinder and a larger drink menu.'],
  ['CRM-AM-2009', 'KitchenAid KF8 Juniper', 'automatic-machines', '5KES8558EJP', 2, 119999, '2 years manufacturer warranty', 'KitchenAid official distributor', 7, 12, 'Fully automatic espresso machine, the top model of the KF range.'],
  ['CRM-FM-3001', 'Caso Aroma Sense', 'filter-machines', '1851', 10, 23999, '2 years manufacturer warranty', 'Caso official distributor', 5, 58, 'Filter coffee machine with adjustable brewing strength.'],
  ['CRM-FM-3002', 'Caso Filter Machine with Grinder', 'filter-machines', '1848', 8, 24999, '2 years manufacturer warranty', 'Caso official distributor', 8, 46, 'Filter coffee machine with a built-in grinder for fresh beans every time.'],
  ['CRM-FM-3003', 'Caso Selection C10 Thermo', 'filter-machines', 'C10', 14, 14999, '2 years manufacturer warranty', 'Caso official distributor', 4, 71, 'Filter coffee machine with a thermal jug that keeps coffee hot without a hot plate.'],
  ['CRM-FM-3004', 'KitchenAid Filter Machine Empire Red', 'filter-machines', '5KCM1209EER', 9, 15999, '2 years manufacturer warranty', 'KitchenAid official distributor', 6, 39, 'Drip filter coffee machine with a glass carafe.'],
  ['CRM-FM-3005', 'KitchenAid Filter Machine Almond Cream', 'filter-machines', '5KCM1209EAC', 9, 15999, '2 years manufacturer warranty', 'KitchenAid official distributor', 4, 35, 'Drip filter coffee machine with a glass carafe.'],
  ['CRM-FM-3006', 'WMF Kitchenminis Filter Machine', 'filter-machines', 'Kitchenminis Glass', 18, 12999, '2 years manufacturer warranty', 'WMF official distributor', 8, 66, 'Compact filter coffee machine with a glass carafe for small kitchens.'],
  ['CRM-TK-4001', 'Leggno Gourmet Pro Turkish Coffee Machine Black', 'turkish-coffee-machines', 'Gourmet Pro', 20, 5499, '2 years manufacturer warranty', 'Leggno official distributor', 3, 120, 'Turkish coffee machine that brews in the traditional way, with foam.'],
  ['CRM-FP-5001', 'Bialetti Moka Express 1 Cup', 'french-press-moka', 'Moka Express 1', 30, 1799, 'No warranty', 'Bialetti official distributor', 7, 156, 'Classic aluminium stovetop moka pot for one cup.'],
  ['CRM-FP-5002', 'Bialetti Rainbow Moka Pot 3 Cup Light Blue', 'french-press-moka', 'Rainbow 3', 16, 2299, 'No warranty', 'Bialetti official distributor', 4, 88, 'Coloured aluminium stovetop moka pot for three cups.'],
  ['CRM-FP-5003', 'Bialetti French Press 350 ml Black', 'french-press-moka', 'Smart 350 ml', 0, 2299, 'No warranty', 'Bialetti official distributor', 4, 61, 'Glass French press for about two cups.'],
  ['CRM-FP-5004', 'Bialetti Smart French Press 1 L Black', 'french-press-moka', 'Smart 1 L', 12, 2199, 'No warranty', 'Bialetti official distributor', 3, 54, 'Glass French press for about four mugs.'],
  ['CRM-PM-6001', 'Jura GIGA X8c Aluminum Black', 'professional-machines', 'GIGA X8c', 1, 959999, '2 years manufacturer warranty', 'Jura official distributor', 8, 4, 'Professional fully automatic machine with high daily capacity for offices and cafes.'],
  ['CRM-PM-6002', 'Jura X10 Dark Inox', 'professional-machines', 'X10 (EA)', 2, 361999, '2 years manufacturer warranty', 'Jura official distributor', 7, 7, 'Professional fully automatic machine for small offices and meeting rooms.'],
  ['CRM-CF-7001', 'Hola Sol Espresso Italiano Beans 250 g', 'coffee', 'Espresso Italiano 250 g', 45, 549, 'No warranty (consumable)', 'Hola Sol official distributor', 3, 175, 'Whole bean espresso coffee, 250 g.'],
  ['CRM-CF-7002', 'Hola Sol Adicto Filter Beans 1 kg', 'coffee', 'Adicto 1000 g', 25, 1589, 'No warranty (consumable)', 'Hola Sol official distributor', 3, 132, 'Whole bean coffee for filter brewing, 1 kg.'],
  ['CRM-CF-7003', 'Coach Coffee Colombia Huila Lucero Beans 250 g', 'coffee', 'Huila Lucero 250 g', 20, 520, 'No warranty (consumable)', 'Coach Coffee official distributor', 5, 96, 'Single origin whole bean coffee from Huila, Colombia, 250 g.'],
  ['CRM-CF-7004', 'Hola Sol Turkish Coffee 250 g', 'coffee', 'Turkish Coffee 250 g', 80, 279, 'No warranty (consumable)', 'Hola Sol official distributor', 3, 210, 'Finely ground Turkish coffee, 250 g.'],
  ['CRM-CF-7005', 'Hola Sol Perla Nera Beans 250 g', 'coffee', 'Perla Nera 250 g', 30, 699, 'No warranty (consumable)', 'Hola Sol official distributor', 3, 74, 'Whole bean espresso coffee, 250 g.'],
  ['CRM-CF-7006', 'Kahve Fabrikası Holy Shot Espresso Blend 250 g', 'coffee', 'Holy Shot 250 g', 0, 339, 'No warranty (consumable)', 'Kahve Fabrikası official distributor', 1, 58, 'Whole bean espresso blend, 250 g.'],
  ['CRM-GR-8001', 'Sage The Smart Grinder Pro', 'grinders', 'BCG820', 8, 36999, '2 years manufacturer warranty', 'Sage official distributor', 8, 69, 'Electric burr grinder with many grind settings and dose control.'],
  ['CRM-GR-8002', 'Caso Barista Flavour Grinder', 'grinders', '1832', 10, 17999, '2 years manufacturer warranty', 'Caso official distributor', 8, 52, 'Electric burr grinder for espresso and filter coffee.'],
  ['CRM-GR-8003', 'KitchenAid Artisan Burr Grinder Medallion Silver', 'grinders', '5KCG8433EMS', 6, 14999, '2 years manufacturer warranty', 'KitchenAid official distributor', 3, 31, 'Electric burr grinder with a digital display.'],
  ['CRM-GR-8004', 'Zassenhaus Manaos Hand Grinder', 'grinders', 'Manaos', 14, 4199, 'No warranty', 'Zassenhaus official distributor', 4, 77, 'Manual coffee grinder with a hand crank.'],
  ['CRM-SV-9001', 'WMF Kineo Latte Macchiato Set of 2', 'coffee-serving', 'Kineo', 25, 1899, 'No warranty', 'WMF official distributor', 3, 64, 'Two double-wall glasses for latte macchiato.'],
  ['CRM-SV-9002', 'WMF Cappuccino Glass Set of 2', 'coffee-serving', 'Cappuccino 2-pack', 30, 1499, 'No warranty', 'WMF official distributor', 3, 48, 'Two glass cappuccino cups.'],
  ['CRM-SV-9003', 'Kela Fontana Glass Milk Jug 700 ml', 'coffee-serving', 'Fontana 700 ml', 18, 1999, 'No warranty', 'Kela official distributor', 3, 39, 'Glass milk jug, 700 ml.'],
  ['CRM-SV-9004', 'Bialetti Milk and Cappuccino Frother 3 Cup Black', 'coffee-serving', 'Frother 3 Cup', 15, 1999, 'No warranty', 'Bialetti official distributor', 1, 57, 'Stovetop milk frother for cappuccino.'],
  ['CRM-SV-9005', 'Bialetti Thermos 750 ml Grey', 'coffee-serving', 'Thermos 750 ml', 22, 1799, 'No warranty', 'Bialetti official distributor', 1, 43, 'Insulated thermos bottle, 750 ml.'],
  ['CRM-AC-9501', 'Jura Stainless Steel Milk Pipe HP2', 'care-accessories', 'HP2', 20, 3199, 'No warranty', 'Jura official distributor', 1, 22, 'Replacement stainless steel milk pipe for Jura machines.'],
  ['CRM-AC-9502', 'Jura 3-Phase Cleaning Tablets 25 pcs', 'care-accessories', '25 tablets', 40, 5299, 'No warranty (consumable)', 'Jura official distributor', 1, 63, 'Cleaning tablets for Jura fully automatic machines, 25 pieces.'],
  ['CRM-AC-9503', 'Sage Descaler 4-pack', 'care-accessories', 'SES007', 35, 3199, 'No warranty (consumable)', 'Sage official distributor', 1, 70, 'Descaling sachets for Sage espresso machines, pack of 4.'],
  ['CRM-AC-9504', 'Jura Claris Smart+ Water Filter', 'care-accessories', 'Claris Smart+', 30, 2499, 'No warranty (consumable)', 'Jura official distributor', 3, 84, 'Water filter cartridge for Jura machines.'],
  ['CRM-AC-9505', 'Sage The Force Gauge Tamper 58 mm', 'care-accessories', 'Force Gauge 58 mm', 8, 15999, 'No warranty', 'Sage official distributor', 5, 26, 'Tamper with a force gauge for even pressure, 58 mm.'],
  ['CRM-AC-9506', 'Sage The Pro Control Jug', 'care-accessories', 'Pro Control Jug', 16, 6299, 'No warranty', 'Sage official distributor', 4, 47, 'Stainless steel milk jug for latte art.'],
];

const categories = rawCategories.map((category, index) => ({
  id: index + 1,
  ...category,
  productCount: rawProducts.filter((row) => row[2] === category.slug).length,
}));

const products = rawProducts.map((row, index) => {
  const [serialNumber, name, slug, model, quantityInStock, price, warrantyStatus, distributor, imageCount, popularity, description] = row;
  const category = categories.find((item) => item.slug === slug);
  return {
    id: index + 1,
    name,
    model,
    serialNumber,
    description,
    quantityInStock,
    price,
    warrantyStatus,
    distributor,
    imageCount,
    popularity,
    categoryId: category.id,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    inStock: quantityInStock > 0,
    category: { id: category.id, name: category.name, slug: category.slug },
  };
});

export const productsApi = {
  list: async (category) => ({
    products: category ? products.filter((product) => product.category.slug === category) : products,
  }),
  browse: async ({ category, q, sort } = {}) => {
    const term = q?.toLowerCase();
    const found = products.filter(
      (product) =>
        (!category || product.category.slug === category) &&
        (!term || product.name.toLowerCase().includes(term) || product.description.toLowerCase().includes(term))
    );
    const orders = {
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      popularity: (a, b) => b.popularity - a.popularity,
    };
    return { products: orders[sort] ? [...found].sort((a, b) => orders[sort](a, b) || a.id - b.id) : found };
  },
};

export const categoriesApi = {
  list: async () => ({ categories }),
};
