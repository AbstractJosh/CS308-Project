import db from '../db/knex.js';
import { conflict, notFound, unauthorized } from '../utils/httpError.js';
import { signToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const PG_UNIQUE_VIOLATION = '23505';

// The API never sends the password hash (handbook 7.8).
function toPublicUser({ passwordHash, ...user }) {
  return user;
}

// Creates a CUSTOMER account. The database's unique rule on email catches duplicates,
// even when two people register with the same email at the same moment.
export async function register({ name, email, password, taxId, homeAddress }) {
  const passwordHash = await hashPassword(password);
  try {
    const [user] = await db('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        tax_id: taxId,
        home_address: homeAddress,
        role: 'CUSTOMER',
      })
      .returning('*');
    return { user: toPublicUser(user), token: signToken(user) };
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) throw conflict('An account with this email already exists');
    throw err;
  }
}

// A wrong email and a wrong password give the same answer, so nobody can find out who has an account.
export async function login({ email, password }) {
  const user = await db('users').where({ email }).first();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw unauthorized('Email or password is incorrect');
  }
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getMe(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw notFound('User not found');
  return toPublicUser(user);
}
