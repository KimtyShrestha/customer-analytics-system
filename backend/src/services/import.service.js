const crypto = require('crypto');
const db = require('../config/db');
const { parseCsv, groupIntoVisits } = require('./csv.service');

async function importCsv(buffer, filename, userId, branchId = 1) {
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const dup = await db.query('SELECT id FROM import_batches WHERE file_checksum = $1', [checksum]);
  if (dup.rows.length) {
    throw Object.assign(new Error('This file has already been imported'), { status: 409, expose: true });
  }

  const { records, hasPhone } = parseCsv(buffer);
  const { visits, errors } = groupIntoVisits(records, hasPhone);

  const client = await db.getClient();
  let batchId;

  try {
    await client.query('BEGIN');

    const batch = await client.query(
      `INSERT INTO import_batches (original_filename, file_checksum, imported_by, branch_id, total_rows)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [filename, checksum, userId, branchId, records.length]
    );
    batchId = batch.rows[0].id;

    let inserted = 0;
    let skipped = 0;

    for (const v of visits) {
      let customerId = null;

      if (v.customer_hash) {
        const cust = await client.query(
          `INSERT INTO customers (customer_hash, first_seen_at, last_seen_at)
           VALUES ($1,$2,$2)
           ON CONFLICT (customer_hash) DO UPDATE
             SET first_seen_at = LEAST(customers.first_seen_at, EXCLUDED.first_seen_at),
                 last_seen_at  = GREATEST(customers.last_seen_at, EXCLUDED.last_seen_at),
                 updated_at    = NOW()
           RETURNING id`,
          [v.customer_hash, v.visit_date]
        );
        customerId = cust.rows[0].id;
      } else {
        skipped += 1;
        continue;
      }

      const totalQty = v.items.reduce((s, i) => s + i.quantity, 0);

      const visitRow = await client.query(
        `INSERT INTO visits
           (customer_id, branch_id, import_batch_id, invoice_number, visit_date,
            visit_time, invoice_total, payment_method, cashier, total_quantity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (branch_id, invoice_number) DO NOTHING
         RETURNING id`,
        [customerId, branchId, batchId, v.invoice_number, v.visit_date,
         v.visit_time, v.invoice_total, v.payment_method, v.cashier, totalQty]
      );

      if (!visitRow.rows.length) { skipped += 1; continue; }

      const visitId = visitRow.rows[0].id;

      for (const item of v.items) {
        await client.query(
          `INSERT INTO visit_items (visit_id, product_name, quantity, unit_price, line_total)
           VALUES ($1,$2,$3,$4,$5)`,
          [visitId, item.product_name, item.quantity, item.unit_price, item.line_total]
        );
      }
      inserted += 1;
    }

    await client.query(
      `UPDATE import_batches
         SET status='completed', successful_rows=$1, rejected_rows=$2,
             total_invoices=$3, error_summary=$4, completed_at=NOW()
       WHERE id=$5`,
      [records.length - errors.length, errors.length, inserted,
       JSON.stringify(errors.slice(0, 100)), batchId]
    );

    await client.query('COMMIT');

    return {
      batchId,
      totalRows: records.length,
      visitsImported: inserted,
      visitsSkipped: skipped,
      rejectedRows: errors.length,
      hasCustomerData: hasPhone,
      errors: errors.slice(0, 20),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { importCsv };