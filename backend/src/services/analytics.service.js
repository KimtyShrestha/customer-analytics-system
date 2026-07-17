const db = require('../config/db');
const { ANALYSIS_REFERENCE_DATE } = require('../config/constants');

async function getSettings() {
  const r = await db.query('SELECT * FROM segmentation_settings WHERE id = 1');
  return r.rows[0];
}

/**
 * Recalculates behavioural metrics and assigns each customer to
 * exactly one segment. Rules are mutually exclusive and evaluated
 * in priority order: dormant > at_risk > repeat > occasional > new.
 * Thresholds are calibrated from observed inter-visit intervals.
 */
async function recalculateSegments() {
  const s = await getSettings();

  const result = await db.query(
    `
    WITH metrics AS (
      SELECT
        c.id,
        COUNT(v.id)                                        AS frequency,
        MAX(v.visit_date)                                  AS last_visit,
        ($1::date - MAX(v.visit_date))                     AS recency
      FROM customers c
      JOIN visits v ON v.customer_id = c.id
      GROUP BY c.id
    )
    UPDATE customers c
    SET current_segment = CASE
          WHEN m.recency > $2                        THEN 'dormant'
          WHEN m.recency > $3                        THEN 'at_risk'
          WHEN m.frequency >= $4                     THEN 'repeat'
          WHEN m.frequency = 1 AND m.recency <= $5   THEN 'new'
          ELSE 'occasional'
        END,
        updated_at = NOW()
    FROM metrics m
    WHERE c.id = m.id
    RETURNING c.current_segment
    `,
    [ANALYSIS_REFERENCE_DATE, s.dormant_days_threshold, s.at_risk_days_threshold,
     s.repeat_frequency_threshold, s.new_customer_days]
  );

  return { updated: result.rowCount };
}

async function getCustomerMetrics({ segment, search, sort = 'recency', page = 1, limit = 25 }) {
  const offset = (page - 1) * limit;
  const sortMap = {
    recency: 'recency ASC',
    frequency: 'frequency DESC',
    total_spend: 'total_spend DESC',
    avg_spend: 'avg_spend DESC',
  };
  const orderBy = sortMap[sort] || sortMap.recency;

  const params = [ANALYSIS_REFERENCE_DATE];
  let where = '';

  if (segment) { params.push(segment); where += ` AND c.current_segment = $${params.length}`; }
  if (search)  { params.push(`${search}%`); where += ` AND c.customer_hash LIKE $${params.length}`; }

  params.push(limit, offset);

  const rows = await db.query(
    `
    SELECT
      c.id,
      LEFT(c.customer_hash, 12)                   AS customer_ref,
      c.current_segment                           AS segment,
      MIN(v.visit_date)                           AS first_visit,
      MAX(v.visit_date)                           AS last_visit,
      ($1::date - MAX(v.visit_date))              AS recency,
      COUNT(v.id)                                 AS frequency,
      SUM(v.invoice_total)                        AS total_spend,
      ROUND(AVG(v.invoice_total), 2)              AS avg_spend
    FROM customers c
    JOIN visits v ON v.customer_id = c.id
    WHERE 1=1 ${where}
    GROUP BY c.id
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  const total = await db.query(`SELECT COUNT(*) FROM customers c WHERE 1=1 ${where}`,
    params.slice(0, params.length - 2));

  return { customers: rows.rows, total: parseInt(total.rows[0].count, 10), page, limit };
}

async function getDashboard() {
  const [kpis, segments, trend, revenue, payments] = await Promise.all([
    db.query(
      `
      WITH m AS (
        SELECT c.id, COUNT(v.id) AS frequency, SUM(v.invoice_total) AS spend,
               ($1::date - MAX(v.visit_date)) AS recency, c.current_segment
        FROM customers c JOIN visits v ON v.customer_id = c.id GROUP BY c.id
      )
      SELECT
        COUNT(*)                                                  AS total_customers,
        COUNT(*) FILTER (WHERE frequency >= 2)                    AS repeat_customers,
        COUNT(*) FILTER (WHERE current_segment = 'dormant')       AS dormant_customers,
        COUNT(*) FILTER (WHERE current_segment = 'at_risk')       AS at_risk_customers,
        ROUND(AVG(spend / frequency), 2)                          AS avg_customer_spend,
        ROUND(100.0 * COUNT(*) FILTER (WHERE frequency >= 2) / NULLIF(COUNT(*),0), 1) AS repeat_rate,
        SUM(spend)                                                AS total_revenue
      FROM m
      `, [ANALYSIS_REFERENCE_DATE]
    ),
    db.query(`SELECT current_segment AS segment, COUNT(*) AS count
                FROM customers WHERE current_segment IS NOT NULL
               GROUP BY current_segment ORDER BY count DESC`),
    db.query(`SELECT TO_CHAR(visit_date,'YYYY-MM-DD') AS date, COUNT(*) AS visits
                FROM visits GROUP BY visit_date ORDER BY visit_date`),
    db.query(`SELECT TO_CHAR(visit_date,'YYYY-MM') AS month,
                     SUM(invoice_total) AS revenue, COUNT(*) AS visits
                FROM visits GROUP BY 1 ORDER BY 1`),
    db.query(`SELECT payment_method, COUNT(*) AS count, SUM(invoice_total) AS revenue
                FROM visits GROUP BY payment_method ORDER BY count DESC`),
  ]);

  return {
    kpis: kpis.rows[0],
    segmentDistribution: segments.rows,
    visitTrend: trend.rows,
    revenueTrend: revenue.rows,
    paymentDistribution: payments.rows,
  };
}

async function getCustomerProfile(id) {
  const profile = await db.query(
    `
    SELECT
      c.id,
      LEFT(c.customer_hash, 12)      AS customer_ref,
      c.current_segment              AS segment,
      MIN(v.visit_date)              AS first_visit,
      MAX(v.visit_date)              AS last_visit,
      ($2::date - MAX(v.visit_date)) AS recency,
      COUNT(v.id)                    AS frequency,
      SUM(v.invoice_total)           AS total_spend,
      ROUND(AVG(v.invoice_total), 2) AS avg_spend,
      SUM(v.total_quantity)          AS total_items
    FROM customers c JOIN visits v ON v.customer_id = c.id
    WHERE c.id = $1 GROUP BY c.id
    `, [id, ANALYSIS_REFERENCE_DATE]
  );

  if (!profile.rows.length) return null;

  const visits = await db.query(
    `SELECT v.id, v.invoice_number, v.visit_date, v.visit_time,
            v.invoice_total, v.payment_method, v.total_quantity
       FROM visits v WHERE v.customer_id = $1 ORDER BY v.visit_date DESC`, [id]
  );

  return { ...profile.rows[0], visits: visits.rows };
}

module.exports = { recalculateSegments, getCustomerMetrics, getDashboard, getCustomerProfile, getSettings };