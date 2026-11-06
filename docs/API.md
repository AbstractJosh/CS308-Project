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

`category` is `{ id, name, slug, description, productCount }` (productCount counts active products only).
`product` is `{ id, name, model, serialNumber, description, quantityInStock, price, warrantyStatus, distributor, imageCount, popularity, categoryId, createdAt, updatedAt, inStock, category: { id, name, slug } }`, never `cost` or `isActive`.
Only active products are returned; out-of-stock products are still listed with `inStock: false`. An unknown category slug gives `{ "products": [] }`. Products come in id order.

## Cart (Luis)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|

## Orders (Luis, Ulukan)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|

## Admin (Neslihan, Murat, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
