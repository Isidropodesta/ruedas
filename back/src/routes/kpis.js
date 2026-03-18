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

// GET /api/kpis/advanced
router.get('/advanced', async (req, res) => {
  try {
    // avg_days_to_sell: average days between created_at and sold_at for sold vehicles
    const avgResult = await pool.query(`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (sold_at - created_at)) / 86400), 0) AS avg_days_to_sell
      FROM vehicles
      WHERE status = 'sold' AND sold_at IS NOT NULL AND created_at IS NOT NULL
    `);

    // stale_vehicles: available vehicles with more than 30 days without selling
    const staleResult = await pool.query(`
      SELECT
        v.id, v.brand, v.model, v.year,
        EXTRACT(DAY FROM NOW() - v.created_at)::INT AS days_in_stock,
        (SELECT vp.url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1) AS photo
      FROM vehicles v
      WHERE v.status = 'available'
        AND v.created_at <= NOW() - INTERVAL '30 days'
      ORDER BY days_in_stock DESC
    `);

    // stock_by_brand: count of available vehicles per brand
    const brandResult = await pool.query(`
      SELECT brand, COUNT(*) AS count
      FROM vehicles
      WHERE status = 'available' AND brand IS NOT NULL
      GROUP BY brand
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        avg_days_to_sell: Math.round(parseFloat(avgResult.rows[0].avg_days_to_sell) * 10) / 10,
        stale_vehicles: staleResult.rows,
        stock_by_brand: brandResult.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
