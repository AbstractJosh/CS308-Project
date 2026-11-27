# Progress demo checklist (SCRUM-93)

Progress demo: week 11 (11 Dec). Requirements checked: 1, 3, 4, 5, 7 and 9 of the course project.
Checked against `develop` on 24 Nov 2026 (after #50, #55, #56). Sprint 3 must be merged and tagged by Thu 3 Dec.

Legend: **Done** = works on develop now. **Sprint 3** = a planned Sprint 3 card covers it. **Gap** = nothing covers it yet, a new card is needed.

## Req 1: categories, select a product, add to cart

| Check | Status | Where |
|---|---|---|
| Products are shown in categories (`/shop`, category chips) | Done | CatalogPage, `GET /categories`, `GET /products?category=` |
| A product page can be opened from the catalog | Done | ProductPage |
| Add to cart from the card and from the product page | Done | `useAddToCart`, CartContext (SCRUM-71) |
| Cart page: change quantity, remove | Done | CartPage, cart API (SCRUM-33) |

## Req 3: stock, delivery department, order status

| Check | Status | Where |
|---|---|---|
| Stock is shown when a product is selected | Done | ProductPage stock row and card stock label |
| Quantity in the cart can never go above stock | Done | cart API (SCRUM-33) |
| Buying lowers the stock and raises popularity | Done | `placeOrder` transaction (SCRUM-35) |
| The order reaches the delivery department | Done | delivery rows, `/admin/deliveries` (SCRUM-57) |
| Order history shows processing / in transit / delivered | Done | OrderHistoryPage (SCRUM-40), order status buttons (SCRUM-60) |

## Req 4: guest cart, login before paying, bank, invoice, email

| Check | Status | Where |
|---|---|---|
| A guest can browse and add to the cart | Done | guest cart in localStorage (SCRUM-71) |
| Checkout asks a guest to log in, then comes back | Done | SCRUM-42 |
| The guest cart is kept after login | Done | `POST /cart/merge` (SCRUM-34) |
| The mock bank approves 4242 4242 4242 4242 and rejects 4000 0000 0000 0002 | Done | `bankService.charge`, `POST /checkout` (SCRUM-44, SCRUM-59) |
| The invoice is shown on the screen after payment | Done | confirmation page: items, total, address, card last 4, invoice number |
| A PDF of the invoice is emailed | Done | Ethereal test inbox, preview link in the backend log (SCRUM-50) |
| The PDF can be downloaded | Done | `GET /invoices/:id/pdf` (SCRUM-49, SCRUM-54) |

## Req 5: ratings and comments

| Check | Status | Where |
|---|---|---|
| Reviews table and API | Sprint 3 | SCRUM-72, SCRUM-73 (Luis) |
| Only products in a delivered order can be rated and commented | Sprint 3 | SCRUM-73; delivered status exists already (SCRUM-60) |
| Rating 1 to 5 is visible at once, comment waits for approval | Sprint 3 | SCRUM-73 |
| Star rating and comment form on the product page | Sprint 3 | SCRUM-85, SCRUM-87 (Sezin) |
| Product manager approves or rejects comments | Sprint 3 | SCRUM-90 (Sidar), SCRUM-83 / SCRUM-91 (Ulukan, Sidar) |
| Whole flow tested end to end | Sprint 3 | SCRUM-74, SCRUM-96 (Luis, Neslihan) |
| Demo data: the demo customer has a delivered order, and there is one approved and one pending comment, so req 5 can be shown without placing and delivering an order live | **Gap** | new card needed (seed or demo script) |

## Req 7: search and sort

| Check | Status | Where |
|---|---|---|
| Search by name or description | Done | SCRUM-37 |
| Search works with Turkish letters (ı, İ, ş, ğ, ç, ö, ü) | Done | SCRUM-114 (#55) |
| Sort by price and by popularity | Done | SCRUM-38 |
| An out-of-stock product is still found by search | Done | SCRUM-37 |
| An out-of-stock product cannot be added to the cart | Done | card button disabled, product page buttons disabled, cart API refuses |

## Req 9: product properties

| Check | Status | Where |
|---|---|---|
| ID, name, model, serial number, description, quantity in stock, price, warranty status, distributor | Done | `products` table (001_init), product page spec list |

## Not a demo requirement, but it affects the demo

| Check | Status | Where |
|---|---|---|
| The site looks consistent and professional (req 6) | Sprint 3 | SCRUM-94 new look, SCRUM-95 empty / loading / error states (Neslihan) |
| Admin area on a narrow screen, small buttons in the delivery list (Sidar's notes on #50) | Sprint 3 | SCRUM-95 (Neslihan) |
| The demo runs on someone else's laptop from a fresh clone (README steps) | Sprint 3 | SCRUM-98 to SCRUM-103 (everyone) |
| Demo script: who shows what, in which order | Sprint 3 | SCRUM-97 (Neslihan) |

## Result

- Requirements 1, 3, 4, 7 and 9 are done on develop.
- Requirement 5 is fully planned in Sprint 3.
- One gap: demo data for requirement 5. New card created for it.
