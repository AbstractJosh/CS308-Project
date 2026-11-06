import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Turns a plain password into the hash we store in users.password_hash.
export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Resolves to true when the plain password matches the stored hash.
export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
