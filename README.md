# Crema & Co.

Online store for coffee machines, coffee and brewing accessories.
CS308 Software Engineering, Team 10, Sabancı University, Fall 2026-27.

- **backend/**: Node.js 20+, Express 4, PostgreSQL 16 with Knex (port 4000)
- **frontend/**: React 18 with Vite 6 (port 5173, forwards `/api` to the backend)
- **docs/**: `API.md` (every endpoint), `CONTRIBUTING.md` (how we use Git), `design/` (design references)
- **prototype/**: an early clickable prototype. Not part of the app and not the design to follow.

## Run it on your laptop

```bash
git clone https://github.com/AbstractJosh/CS308-Project
cd CS308-Project

# database (pick one)
docker compose up -d
#   or macOS without Docker:
brew install postgresql@16 && brew services start postgresql@16
psql postgres -c "CREATE USER crema WITH PASSWORD 'crema' CREATEDB;"
psql postgres -c "CREATE DATABASE crema_store OWNER crema;"

# backend -> http://localhost:4000/api/health
cd backend && cp .env.example .env && npm install
npm run db:migrate && npm run db:seed
npm run dev

# frontend (second terminal) -> http://localhost:5173
cd frontend && npm install && npm run dev
```

Tests: `npm test` in `backend` and in `frontend`. They do not need a database.

| Problem | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running. |
| `password authentication failed for user "crema"` | Run the CREATE USER line again, or fix `DATABASE_URL` in `.env`. |
| Port already in use | Close the other dev server. |
| "Cannot reach the server" on the site | Start the backend. |

## Email and invoice PDFs (Sprint 2)

Invoice PDFs are made with PDFKit (`backend/src/utils/invoicePdf.js`) and emailed with
Nodemailer (`backend/src/services/email.service.js`). These `.env` settings control email:

| `.env` name | Value in development | Meaning |
|---|---|---|
| `SMTP_HOST` | empty | Email server. Empty means a free Ethereal test inbox is used. |
| `SMTP_PORT` | empty | Server port (587 when empty; 465 uses TLS from the start). |
| `SMTP_USER`, `SMTP_PASS` | empty | Login for the email server. |
| `MAIL_FROM` | empty | Sender shown on emails (default `Crema & Co. <no-reply@crema.com>`). |

With the SMTP values empty, nothing is really delivered: the backend console prints
`Email preview: https://ethereal.email/message/...`; open that link to see the email and its PDF.
Ethereal needs an internet connection.

## Team

| Name | Main area |
|---|---|
| Neslihan Ünal | Scrum Master; repo, CI and starter project; product manager admin; integration |
| Luis Emre Anzerlioğlu Vazquez | Products API, cart, orders, ratings, refunds, concurrency |
| Ulukan Keskin | Accounts and login, payment, wishlist, live chat backend |
| Murat Çankaya | Database and seed data, invoices and email, product manager API, sales manager API, security review |
| Zeynep Sezin Apaydın | Product page, login pages, cart and checkout pages, sales manager pages, UI polish |
| Sidar Yaşan | Home and catalog pages, search and sort, order history, admin pages, live chat frontend |
