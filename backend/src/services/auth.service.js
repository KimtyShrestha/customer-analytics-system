const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function login(email, password) {
  const result = await db.query(
    'SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = $1',
    [String(email).toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user) return null;
  if (user.status !== 'active') return null;

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
  };
}

module.exports = { hashPassword, login };