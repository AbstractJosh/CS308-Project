import 'dotenv/config';

// Database config used by the app (src/db/knex.js) and by the knex CLI
// (npm run db:migrate, db:seed, db:rollback, db:reset).
const base = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' },
  pool: { min: 0, max: 10 },
};

export default {
  development: base,
  test: base,
  production: base,
};
