const { normalisePhone } = require('../src/utils/phone');
const { hashCustomer } = require('../src/utils/hash');

const inputs = [
  '9841234567',
  '+977 9841234567',
  '977-984-123-4567',
  '09841234567',
  '984 1234567',
  '1234567',
  '',
  null,
];

console.log('--- Normalisation ---');
inputs.forEach((i) => console.log(JSON.stringify(i), '->', normalisePhone(i)));

console.log('\n--- Determinism ---');
const a = hashCustomer(normalisePhone('+977 9841234567'));
const b = hashCustomer(normalisePhone('09841234567'));
const c = hashCustomer(normalisePhone('9851111111'));
console.log('Same customer, different formats match:', a === b);
console.log('Different customer differs:', a !== c);
console.log('Hash length is 64:', a.length === 64);
console.log('Sample hash:', a);