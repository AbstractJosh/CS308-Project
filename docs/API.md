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

## Catalog (Luis, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|

## Cart (Luis)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|

## Orders (Luis, Ulukan)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|

## Admin (Neslihan, Murat, Sidar)

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
