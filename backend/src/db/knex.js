import knex from 'knex';
import config from '../../knexfile.js';
import { env } from '../config/env.js';
import { rowToCamel } from '../utils/case.js';

// The one shared database connection. Import it as: import db from '../db/knex.js';
// Write snake_case in queries and inserts; rows come back with camelCase keys.
const db = knex({
  ...(config[env.nodeEnv] || config.development),
  postProcessResponse: (result) => (Array.isArray(result) ? result.map(rowToCamel) : rowToCamel(result)),
});

export default db;
