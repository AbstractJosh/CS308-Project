# Crema & Co. API

Base URL: `http://localhost:4000/api`. JSON in and out.
Protected routes need the header `Authorization: Bearer <token>`.

Every error looks like this (`details` only on validation errors):

```json
{ "error": "Enter a valid email", "details": [{ "field": "email", "message": "Enter a valid email" }] }
```

The full contracts are in the project handbook, section 8. Add your endpoint here in the
same PR that adds it, inside your area's section. Shared file: only add lines in your own
section, never rewrite or delete other people's lines.

## System

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| GET /health | - | - | 200 `{ "status": "ok" }` | - |

## Auth (Ulukan)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| POST /auth/register | - | `{ name, email, password, taxId, homeAddress }` | 201 `{ user, token }` | 400, 409, 429 |
| POST /auth/login | - | `{ email, password }` | 200 `{ user, token }` | 400, 401, 429 |
| GET /auth/me | user | - | 200 `{ user }` | 401, 404 |

`user` is `{ id, name, email, taxId, homeAddress, role, createdAt, updatedAt }`, never the password hash.
429: login and register allow 50 requests per 15 minutes per IP.

## Catalog (Luis, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| GET /categories | - | - | 200 `{ categories }` | - |
| GET /products | - | query `category` (slug, optional) | 200 `{ products }` | 400 (bad category) |
| GET /products/:id | - | - | 200 `{ product }` | 400 (bad id), 404 |
| GET /products?q= | - | query `q` (search, optional, up to 100 characters), works with `category` | 200 `{ products }` | 400 (search too long) |
| GET /products?sort= | - | query `sort`: `price_asc`, `price_desc`, `popularity` or `newest` (optional), works with `category` and `q` | 200 `{ products }` | 400 (bad sort) |

`category` is `{ id, name, slug, description, productCount }` (productCount counts active products only).
`product` is `{ id, name, model, serialNumber, description, quantityInStock, price, warrantyStatus, distributor, imageCount, popularity, categoryId, createdAt, updatedAt, inStock, category: { id, name, slug } }`, never `cost` or `isActive`.
Only active products are returned; out-of-stock products are still listed with `inStock: false`. An unknown category slug gives `{ "products": [] }`. Products come in id order.
Search (`q`) matches the name or the description, without caring about upper or lower case. `%`, `_` and `\` in the term are searched as plain characters. A blank `q` is ignored. Out-of-stock products are found too, with `inStock: false`.
Turkish letters are folded on both sides (ı and İ to i, ş to s, ğ to g, ç to c, ö to o, ü to u), so `fabrikasi`, `FABRİKASI` and `Fabrikası` all find "Kahve Fabrikası" (SCRUM-114).
Sort: `popularity` and `newest` put the highest first. Products with the same price or popularity stay in id order, so the order never jumps between requests. Without `sort` products come in id order.

## Cart (Luis)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| GET /cart | user | - | 200 `{ cart }` | 401 |
| POST /cart/items | user | `{ productId, quantity }` | 200 `{ cart }` | 400, 401, 404 |
| PATCH /cart/items/:productId | user | `{ quantity }` | 200 `{ cart }` | 400, 401, 404 |
| DELETE /cart/items/:productId | user | - | 200 `{ cart }` | 400 (bad id), 401 |
| DELETE /cart | user | - | 200 `{ cart }` | 401 |
| POST /cart/merge | user | `{ items: [{ productId, quantity }] }` (max 50) | 200 `{ cart }` | 400, 401 |

`cart` is `{ items: [{ productId, quantity, product }], itemCount, subtotal }`. `product` is the Product object above, `itemCount` counts units (2 grinders = 2) and `subtotal` is rounded to 2 decimals. Every cart route answers with the whole cart, so the page can just replace its state. Lines come in the order they were added; removed products are not shown.

Guests keep their cart in `localStorage` (`crema_guest_cart`); these routes are only for logged-in users.

- `quantity` is a whole number from 1 to 99 (400 otherwise).
- POST /cart/items adds to what is already in the cart, capped at stock. Missing or removed product: 404 `Product not found`. No stock: 400 `This product is out of stock`. The cart already holds all the stock: 400 `Only N in stock`.
- PATCH sets the quantity. Above stock: 400 `Only N in stock`. Product not in the cart: 404 `This product is not in your cart`.
- DELETE of a product that is not in the cart is not an error.
- POST /cart/merge runs once after login with the guest cart. Quantities of the same product are added and capped at stock; products that are gone or out of stock are dropped. It runs in one transaction. The frontend then clears `crema_guest_cart`.

## Orders (Luis, Ulukan)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| GET /orders | user | - | 200 `{ orders }` newest first | 401 |
| GET /orders/:id | the order's customer, sales manager, product manager, support agent | - | 200 `{ order }` | 400 (bad id), 401, 403, 404 `Order not found` |
| POST /checkout | customer | `{ deliveryAddress, card: { number, holderName, expiryMonth, expiryYear, cvv } }` | 201 `{ order, invoice: { id, invoiceNumber }, emailSent }` | 400, 401, 402, 403 (staff), 409 |
| POST /orders/:id/cancel | the order's customer | - | 200 `{ order }` with status `CANCELLED` | 400 (bad id, not `PROCESSING`), 401, 403 (staff, another customer), 404 `Order not found` |

`order` is the Order object of handbook 8.1: `{ id, status, total, deliveryAddress, cardLast4, createdAt, deliveredAt, items: [{ id, productId, name, model, quantity, unitPrice }] }`. `total` and `unitPrice` are numbers; `unitPrice` is the price paid at checkout, not today's price. `deliveredAt` is `null` until the order is delivered.

- GET /orders gives only the logged-in user's own orders (staff too), each with its items. No orders: `{ "orders": [] }`. Orders with the same `createdAt` put the higher id first.
- GET /orders/:id: any other customer gets 403, even for an order that exists.
- POST /orders/:id/cancel (SCRUM-81, req 14): only a `PROCESSING` order can be cancelled; any other gives 400, for example `This order is IN_TRANSIT, so it can no longer be cancelled`. One transaction locks the order, sets `CANCELLED` and puts every item's quantity back into stock and off popularity. Two cancels at the same time: one gets 200, the other 400. The payment is not refunded here.

### Fake bank rules (Ulukan)

No real bank is called, so use only these test cards, with any valid expiry and CVV.

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Approved: 201 |
| `4000 0000 0000 0002` | Rejected by the bank: 402 |
| `4242 4242 4242 4241` | Invalid number (fails the Luhn check): 400 |

The bank approves every valid number except those ending in `0002`.
`bankService.charge({ cardNumber, amount })` in `backend/src/services/bank.service.js` returns `{ approved, reference }`.
`reference` is `BNK-` plus 16 characters when approved and `null` when rejected. An `amount` of zero or less is never approved.

`card` in the body of `POST /checkout` is `{ number, holderName, expiryMonth, expiryYear, cvv }`:

- `number`: string, 13 to 19 digits, passes the Luhn check. Spaces are removed first.
- `holderName`: string, 2 to 100 characters after trimming.
- `expiryMonth`: whole number, 1 to 12.
- `expiryYear`: whole number with 4 digits. A form that shows MM/YY sends `2029` for `29`.
- Expiry must be this month or later, by the server's date. A card ending 11/2026 works until the end of November 2026.
- `cvv`: string, 3 or 4 digits for every card. It is a string so a leading zero is kept.

A wrong field gives 400 with `details`, where `field` is the name below:

| `details[].field` | `message` |
|---|---|
| `card` | `Card details are required` (the body has no `card` object) |
| `card.number` | `Card number is required`, `Enter a valid card number` |
| `card.holderName` | `Name on card is required`, `Name on card must be 2 to 100 characters` |
| `card.expiryMonth` | `Expiry month is required`, `Enter a valid expiry month`, `This card has expired` |
| `card.expiryYear` | `Expiry year is required`, `Enter a valid expiry year` |
| `card.cvv` | `CVV is required`, `CVV must be 3 or 4 digits` |

Rejected by the bank: 402 `{ "error": "Payment was rejected by the bank" }`. Nothing is saved and the cart and stock stay the same, so the user can try another card.

Checks run in this order: card fields (400), empty cart (400 `Your cart is empty`), stock (409), bank (402).

### Checkout (Luis, Neslihan, SCRUM-59)

- `deliveryAddress`: 10 to 300 characters after trimming. Messages: `Delivery address is required`, `Delivery address must be 10 to 300 characters` (`details[].field` is `deliveryAddress`).
- Not enough stock: 409 with `details: [{ field: "productId", message: "<name> has only N left" }]`.
- Everything runs in one transaction: order, items, deliveries, payment and invoice are saved together, stock goes down, popularity goes up and the cart is emptied. Any error saves nothing.
- The invoice email is sent after the commit; `emailSent` is `false` if it failed, and the order stays.
- Only customers can check out; staff get 403.

Only the last 4 digits and a salted hash of the number are saved, never the full number or the CVV.

## Wishlist (Ulukan)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| GET /wishlist | customer | - | 200 `{ products }` | 401, 403 |
| POST /wishlist | customer | `{ productId }` | 200 `{ products }` | 400, 401, 403, 404 `Product not found` |
| DELETE /wishlist/:productId | customer | - | 200 `{ products }` | 400 (bad id), 401, 403 |

`products` is a list of Product objects, oldest first. Every route answers with the whole wishlist, so the page can just replace its state. Removed products are not shown. Staff get 403.

- One row per user and product: adding a product that is already there is not an error.
- POST with a missing or removed product: 404. DELETE of a product that is not there is not an error.

## Invoices (Murat)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /invoices/:id/pdf` | the order's customer, product manager, sales manager | - | 200 `application/pdf` (`Content-Disposition: inline; filename="INV-000123.pdf"`) | 400 (bad id), 401, 403, 404 `Invoice not found` |

The checkout writes one invoice per order, numbered `INV-` plus the order id padded to 6 digits (order 123 is `INV-000123`).
`POST /checkout` answers with `invoice: { id, invoiceNumber }`; use that `id` here.
The PDF shows the invoice number, date, customer name, email and tax ID, delivery address, every item with quantity, unit price and line total, and the total (handbook 7.6). Only the last 4 card digits are printed.
Any other customer gets 403, even for an invoice that exists.

After a successful checkout the customer also gets the PDF by email (SCRUM-50): `invoiceService.sendInvoiceForOrder(orderId)` runs after the commit and returns `true` or `false`, which `POST /checkout` passes on as `emailSent`. A failed email never cancels the order (req 4). In development the backend console prints an Ethereal preview link (see the README).

The frontend opens it with the login token, for example `fetch('/api/invoices/7/pdf', { headers: { Authorization: 'Bearer ' + token } })`, then shows the blob in a new tab. A plain link cannot send the token.

## Admin (Neslihan, Murat, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /admin/deliveries` | product manager | query `completed=true\|false` (optional) | 200 `{ deliveries: [{ id, orderId, customerId, productId, productName, quantity, totalPrice, deliveryAddress, completed, orderStatus }] }` | 400 (bad `completed`), 401, 403 |
| `PATCH /admin/orders/:id/status` | product manager | `{ status: "IN_TRANSIT" \| "DELIVERED" }` | 200 `{ order }` | 400 (bad id, bad status, bad move), 401, 403, 404 `Order not found` |
| `GET /admin/products` | product manager | - | 200 `{ products: [adminProduct] }` | 401, 403 |
| `POST /admin/products` | product manager | `productBody` | 201 `{ product: adminProduct }` | 400 (bad field, unknown category), 401, 403, 409 (serial number taken) |
| `PATCH /admin/products/:id` | product manager | any fields of `productBody`, at least one | 200 `{ product: adminProduct }` | 400, 401, 403, 404 `Product not found`, 409 (serial number taken) |
| `DELETE /admin/products/:id` | product manager | - | 204 (no body) | 400 (bad id), 401, 403, 404 `Product not found` |
| `PATCH /admin/products/:id/stock` | product manager | `{ quantityInStock }` | 200 `{ product: adminProduct }` | 400, 401, 403, 404 `Product not found` |
| `POST /admin/categories` | product manager | `{ name, slug?, description? }` | 201 `{ category }` | 400, 401, 403, 409 (name or slug taken) |
| `DELETE /admin/categories/:id` | product manager | - | 204 (no body) | 400 (bad id), 401, 403, 404 `Category not found`, 409 `This category still has products` |
| `GET /admin/invoices` | product manager | query `from`, `to` (`YYYY-MM-DD`, both optional) | 200 `{ invoices: [adminInvoice] }` | 400 (bad date, `from` after `to`), 401, 403 |

### Delivery list (Neslihan, SCRUM-57)

One delivery row per order item, written when the order is placed (SCRUM-35). Open deliveries (`completed: false`) come first, then the newest first.
`totalPrice` is the line total the customer paid. `orderStatus` is the order's status (`PROCESSING`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
`completed` becomes `true` when the product manager moves the order to `DELIVERED` (`PATCH /admin/orders/:id/status`, SCRUM-60).
`completed=false` leaves out cancelled orders (SCRUM-81), since there is nothing left to deliver; without the filter they are listed with `orderStatus: "CANCELLED"`.

### Order status (Neslihan, SCRUM-60)

The product manager moves an order forward one step at a time: `PROCESSING` -> `IN_TRANSIT` -> `DELIVERED` (handbook 7.5).
Any other move gives 400, for example `This order is PROCESSING, so it can only be moved to IN_TRANSIT, not DELIVERED`. A `DELIVERED` or `CANCELLED` order cannot be moved: `This order is DELIVERED and cannot be moved any more`.
Moving to `DELIVERED` sets the order's `deliveredAt` and marks every delivery row of the order `completed: true`, in the same transaction. The customer sees the new status in their order history.
The order row is locked while it changes, so two clicks at the same time cannot move it twice.

### Products and categories for the product manager (Murat, SCRUM-76, SCRUM-77)

These are the product manager's tools (req 12); every route needs the `PRODUCT_MANAGER` role, other users get 403 (req 17).
The admin products page (Sidar, SCRUM-89) and the stock page (SCRUM-90) use these routes; their fake data in `ProductsPage.fakeData.js` already has these shapes.

`productBody` is what the product form sends (`toProductBody` in `pages/admin/productForm.js`):

```json
{
  "name": "Sage The Bambino Plus",
  "model": "SES500 BSS",
  "serialNumber": "CRM-EM-1005",
  "description": "Compact espresso machine with fast heat-up and automatic milk frothing.",
  "categoryId": 1,
  "price": 49999,
  "cost": null,
  "quantityInStock": 12,
  "warrantyStatus": "2 years manufacturer warranty",
  "distributor": "Sage official distributor"
}
```

| Field | Rule (the same limits as the database, handbook 6.1) |
|---|---|
| `name` | text, 1 to 150 characters after trimming |
| `model` | text, 1 to 100 characters |
| `serialNumber` | text, 1 to 60 characters; unique, also among removed products |
| `description` | text, not empty |
| `categoryId` | id of an existing category, else 400 `Category not found` |
| `price` | number, 0 or more, at most 2 decimals, below 100,000,000 |
| `cost` | `null` or a number like `price`; `null` means profit uses 50% of the price (req 11) |
| `quantityInStock` | whole number, 0 or more |
| `warrantyStatus` | text, 1 to 100 characters |
| `distributor` | text, 1 to 150 characters |

Text is trimmed before it is saved. A bad field gives 400 with `details`, one entry per field, for example
`{ "error": "Price must be a number, 0 or more", "details": [{ "field": "price", "message": "Price must be a number, 0 or more" }] }`.
A serial number that is already used gives 409 `A product with this serial number already exists`.

`adminProduct` is the public `product` (Catalog section) plus `cost` (number or `null`): `{ id, name, model, serialNumber, description, quantityInStock, price, cost, warrantyStatus, distributor, imageCount, popularity, categoryId, createdAt, updatedAt, inStock, category: { id, name, slug } }`. `cost` is only ever sent on these admin routes.

- `GET /admin/products` lists every active product in id order, out-of-stock ones too.
- `POST /admin/products` starts the product with `imageCount: 1` and `popularity: 0`. It has no photos yet (`/images/products/<serialNumber>/01.jpg` does not exist), so pages show their placeholder image.
- `PATCH /admin/products/:id` changes only the fields that are sent and sets `updatedAt`. Sending `cost: null` clears the cost.
- `DELETE /admin/products/:id` does not delete the row: it sets `is_active = false`, so the product disappears from the shop, carts can no longer add it, and old orders and invoices still point to it (handbook 6.1). A removed product answers 404 on every admin route.
- `PATCH /admin/products/:id/stock` sets the new stock number (not an amount to add), for example `{ "quantityInStock": 20 }`. The shop shows the new stock right away; `inStock` follows it.

`POST /admin/categories` body: `name` (1 to 80 characters), `slug` (optional, 1 to 80 characters, lowercase letters, digits and `-`; made from the name when left out, `Milk Frothers` -> `milk-frothers`), `description` (optional text). Answers 201 with the same `category` object as `GET /categories`, with `productCount: 0`.
`DELETE /admin/categories/:id` only works on an empty category: if any product, active or removed, still points to it, it answers 409 `This category still has products`. Move or remove the products first.
The admin pages read the category list from the public `GET /categories`.

### Invoices for the product manager (Murat, SCRUM-77)

`GET /admin/invoices` lists all invoices, the newest first (req 12). The sales manager gets the same list in Sprint 4 (handbook 8.4).
`from` and `to` filter by the invoice date in Istanbul time and include both days, for example `?from=2026-11-01&to=2026-11-30`. Either one can be left out.

`adminInvoice` is `{ id, invoiceNumber, orderId, total, createdAt, customer: { id, name, email } }`. Open one with `GET /invoices/:id/pdf` (Invoices section); the product manager may open every invoice.

