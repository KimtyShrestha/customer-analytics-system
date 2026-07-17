const db = require('../config/db');
const { hashPassword } = require('../services/auth.service');

(async () => {
  try {
    const email = 'admin@store.local';
    const password = 'Admin@12345';

    const hash = await hashPassword(password);

    await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      ['Kimti Shrestha', email, hash]
    );

    console.log('Admin seeded:', email, '/', password);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();