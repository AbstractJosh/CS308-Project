import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Turns a plain password into the hash we store in users.password_hash.
export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Resolves to true when the plain password matches the stored hash.
// bcrypt only reads the first 72 bytes, so a longer attempt could match without being the
// real password. Registration never stores a longer one, so it can only be wrong.
export async function verifyPassword(password, hash) {
  if (bcrypt.truncates(password)) return false;
  return bcrypt.compare(password, hash);
}
