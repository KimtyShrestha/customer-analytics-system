/**
 * Normalises Nepali mobile numbers to a single canonical form
 * before hashing. Deterministic normalisation is required so that
 * the same customer always produces the same HMAC (§13).
 */
function normalisePhone(raw) {
  if (raw === null || raw === undefined) return null;

  // Strip everything except digits
  let digits = String(raw).replace(/\D/g, '');

  // Remove Nepal country code if present
  if (digits.startsWith('977') && digits.length > 10) {
    digits = digits.slice(3);
  }

  // Remove a single leading zero (e.g. 09841234567)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Valid Nepali mobile: 10 digits, starts 97 or 98
  if (!/^9[78]\d{8}$/.test(digits)) return null;

  return digits;
}

module.exports = { normalisePhone };