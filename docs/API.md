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

Only the last 4 digits and a salted hash of the number are saved, never the full number or the CVV.

## Invoices (Murat)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /invoices/:id/pdf` | the order's customer, product manager, sales manager | - | 200 `application/pdf` (`Content-Disposition: inline; filename="INV-000123.pdf"`) | 400 (bad id), 401, 403, 404 `Invoice not found` |

The checkout writes one invoice per order, numbered `INV-` plus the order id padded to 6 digits (order 123 is `INV-000123`).
`POST /checkout` answers with `invoice: { id, invoiceNumber }`; use that `id` here.
The PDF shows the invoice number, date, customer name, email and tax ID, delivery address, every item with quantity, unit price and line total, and the total (handbook 7.6). Only the last 4 card digits are printed.
Any other customer gets 403, even for an invoice that exists.

The frontend opens it with the login token, for example `fetch('/api/invoices/7/pdf', { headers: { Authorization: 'Bearer ' + token } })`, then shows the blob in a new tab. A plain link cannot send the token.

## Admin (Neslihan, Murat, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /admin/deliveries` | product manager | query `completed=true\|false` (optional) | 200 `{ deliveries: [{ id, orderId, customerId, productId, productName, quantity, totalPrice, deliveryAddress, completed, orderStatus }] }` | 400 (bad `completed`), 401, 403 |

### Delivery list (Neslihan, SCRUM-57)

One delivery row per order item, written when the order is placed (SCRUM-35). Open deliveries (`completed: false`) come first, then the newest first.
`totalPrice` is the line total the customer paid. `orderStatus` is the order's status (`PROCESSING`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
`completed` becomes `true` when the product manager moves the order to `DELIVERED` (`PATCH /admin/orders/:id/status`, SCRUM-60).
