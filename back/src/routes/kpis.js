const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/kpis/general
router.get('/general', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_vehicles,
        COUNT(*) FILTER (WHERE status = 'available') AS available,
        COUNT(*) FILTER (WHERE status = 'sold') AS sold,
        COUNT(*) FILTER (WHERE status = 'withdrawn') AS withdrawn,
        COALESCE(SUM(sale_price) FILTER (WHERE status = 'sold'), 0) AS total_revenue
      FROM vehicles
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpis/sellers - per-seller KPIs
router.get('/sellers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.active,
        COUNT(v.id) FILTER (WHERE v.status = 'sold') AS vehicles_sold,
        COALESCE(SUM(v.sale_price) FILTER (WHERE v.status = 'sold'), 0) AS total_revenue,
        COALESCE(AVG(v.sale_price) FILTER (WHERE v.status = 'sold'), 0) AS avg_ticket,
        COUNT(v.id) FILTER (
          WHERE v.status = 'sold'
          AND DATE_TRUNC('month', v.sold_at) = DATE_TRUNC('month', NOW())
        ) AS vehicles_sold_this_month,
        COUNT(v.id) FILTER (
          WHERE v.status = 'sold'
          AND DATE_TRUNC('year', v.sold_at) = DATE_TRUNC('year', NOW())
        ) AS vehicles_sold_this_year
      FROM sellers s
      LEFT JOIN vehicles v ON v.seller_id = s.id
      GROUP BY s.id
      ORDER BY total_revenue DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpis/monthly - last 12 months
router.get('/monthly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM') AS month,
        TO_CHAR(DATE_TRUNC('month', sold_at), 'Mon YY') AS month_label,
        COUNT(*) AS count,
        COALESCE(SUM(sale_price), 0) AS revenue
      FROM vehicles
      WHERE status = 'sold'
        AND sold_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', sold_at)
      ORDER BY DATE_TRUNC('month', sold_at) ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
