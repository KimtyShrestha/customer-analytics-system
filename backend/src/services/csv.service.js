const { parse } = require('csv-parse/sync');
const { REQUIRED_COLUMNS } = require('../config/constants');
const { normalisePhone } = require('../utils/phone');
const { hashCustomer } = require('../utils/hash');

function parseCsv(buffer) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) throw Object.assign(new Error('CSV is empty'), { status: 400, expose: true });

  const headers = Object.keys(records[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) {
    throw Object.assign(new Error(`Missing required columns: ${missing.join(', ')}`), { status: 400, expose: true });
  }

  return { records, hasPhone: headers.includes('Customer_Phone') };
}

function validateRow(row, index, hasPhone) {
  const errors = [];
  const rowNum = index + 2;

  if (!row.Invoice_No) errors.push({ row: rowNum, field: 'Invoice_No', reason: 'Missing' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.Invoice_Date || '')) {
    errors.push({ row: rowNum, field: 'Invoice_Date', reason: 'Invalid date format' });
  }

  const qty = parseInt(row.Quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) errors.push({ row: rowNum, field: 'Quantity', reason: 'Must be a positive integer' });

  const rate = parseFloat(row.Rate);
  if (!Number.isFinite(rate) || rate < 0) errors.push({ row: rowNum, field: 'Rate', reason: 'Invalid rate' });

  const net = parseFloat(row.Net_Amount);
  if (!Number.isFinite(net) || net < 0) errors.push({ row: rowNum, field: 'Net_Amount', reason: 'Invalid invoice total' });

  if (!row.Product_Description) errors.push({ row: rowNum, field: 'Product_Description', reason: 'Missing' });

  let phoneHash = null;
  if (hasPhone) {
    const normalised = normalisePhone(row.Customer_Phone);
    if (!normalised) {
      errors.push({ row: rowNum, field: 'Customer_Phone', reason: 'Invalid or missing phone number' });
    } else {
      phoneHash = hashCustomer(normalised);
    }
  }

  return { errors, phoneHash };
}

/**
 * Groups validated line-item rows into invoice-level visits (§17).
 * One invoice = one visit. Invoice-level values are taken from the
 * first row of the group, never summed, preventing the double-counting
 * risk identified in §32.
 */
function groupIntoVisits(records, hasPhone) {
  const visits = new Map();
  const allErrors = [];

  records.forEach((row, idx) => {
    const { errors, phoneHash } = validateRow(row, idx, hasPhone);
    if (errors.length) {
      allErrors.push(...errors);
      return;
    }

    const key = row.Invoice_No;

    if (!visits.has(key)) {
      visits.set(key, {
        invoice_number: key,
        visit_date: row.Invoice_Date,
        visit_time: row.Invoice_Time || null,
        invoice_total: parseFloat(row.Net_Amount),
        payment_method: row.Mode_of_Payment || null,
        cashier: row.Entry_By || null,
        customer_hash: phoneHash,
        items: [],
        rowCount: 0,
      });
    }

    const visit = visits.get(key);

    // Inconsistent invoice-level total within the same invoice
    if (Math.abs(visit.invoice_total - parseFloat(row.Net_Amount)) > 0.01) {
      allErrors.push({ row: idx + 2, field: 'Net_Amount', reason: 'Inconsistent invoice total within invoice' });
      return;
    }

    visit.items.push({
      product_name: row.Product_Description,
      quantity: parseInt(row.Quantity, 10),
      unit_price: parseFloat(row.Rate),
      line_total: parseFloat(row.Amount),
    });
    visit.rowCount += 1;
  });

  return { visits: Array.from(visits.values()), errors: allErrors };
}

module.exports = { parseCsv, groupIntoVisits };