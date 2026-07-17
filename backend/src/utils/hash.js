const crypto = require('crypto');
require('dotenv').config();

const SECRET = process.env.CUSTOMER_HASH_SECRET;

if (!SECRET || SECRET.length < 32) {
  throw new Error('CUSTOMER_HASH_SECRET missing or too short');
}

/**
 * Generates a deterministic pseudonymous identifier from a
 * normalised phone number using keyed HMAC-SHA-256.
 *
 * Deterministic by design: the same input yields the same output,
 * enabling record linkage across visits. bcrypt is unsuitable here
 * because its salting makes outputs non-deterministic (§13).
 *
 * This is pseudonymisation, not anonymisation: the mapping is
 * reversible by anyone holding both the secret and a candidate
 * phone number.
 */
function hashCustomer(normalisedPhone) {
  if (!normalisedPhone) return null;
  return crypto
    .createHmac('sha256', SECRET)
    .update(normalisedPhone)
    .digest('hex');
}

module.exports = { hashCustomer };