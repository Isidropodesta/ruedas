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
        COALESCE(SUM(sale_price) FILTER (WHERE status = 'sold'), 0) AS total_revenue,
        COALESCE(AVG(sale_price) FILTER (WHERE status = 'sold'), 0) AS avg_ticket,
        COUNT(*) FILTER (
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        ) AS vehicles_added_this_month
      FROM vehicles
      WHERE company_id = $1
    `, [req.user.company_id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpis/sellers
// Query params:
//   period: '1m' | '3m' | '6m' | '1y' | 'all' (default: all)
//   seller_id: number (optional — filter to a single seller)
router.get('/sellers', async (req, res) => {
  try {
    const { period, seller_id } = req.query;

    const periodMap = { '1m': '1 month', '3m': '3 months', '6m': '6 months', '1y': '1 year' };
    const interval = periodMap[period] || null;

    const whereConditions = [];
    const params = [];
    let idx = 1;

    whereConditions.push(`s.company_id = $${idx++}`);
    params.push(req.user.company_id);

    if (seller_id) {
      whereConditions.push(`s.id = $${idx++}`);
      params.push(parseInt(seller_id));
    }

    let periodFilter = '';
    if (interval) {
      params.push(interval);
      periodFilter = `AND v.sold_at >= NOW() - $${idx++}::INTERVAL`;
    }

    const where = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.active,
        COUNT(v.id) FILTER (WHERE v.status = 'sold' ${periodFilter}) AS vehicles_sold,
        COALESCE(SUM(v.sale_price) FILTER (WHERE v.status = 'sold' ${periodFilter}), 0) AS total_revenue,
        COALESCE(AVG(v.sale_price) FILTER (WHERE v.status = 'sold' ${periodFilter}), 0) AS avg_ticket,
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
      ${where}
      GROUP BY s.id
      ORDER BY total_revenue DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpis/monthly
// Query params:
//   period: '1m' | '3m' | '6m' | '1y' | '2y' (default: 1y = last 12 months)
router.get('/monthly', async (req, res) => {
  try {
    const { period } = req.query;
    const periodMap = { '1m': '1 month', '3m': '3 months', '6m': '6 months', '1y': '12 months', '2y': '24 months' };
    const interval = periodMap[period] || '12 months';

    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM') AS month,
        TO_CHAR(DATE_TRUNC('month', sold_at), 'Mon YY') AS month_label,
        COUNT(*) AS count,
        COALESCE(SUM(sale_price), 0) AS revenue
      FROM vehicles
      WHERE status = 'sold'
        AND company_id = $2
        AND sold_at >= NOW() - $1::INTERVAL
      GROUP BY DATE_TRUNC('month', sold_at)
      ORDER BY DATE_TRUNC('month', sold_at) ASC
    `, [interval, req.user.company_id]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpis/advanced
router.get('/advanced', async (req, res) => {
  try {
    const avgResult = await pool.query(`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (sold_at - created_at)) / 86400), 0) AS avg_days_to_sell
      FROM vehicles
      WHERE status = 'sold' AND company_id = $1 AND sold_at IS NOT NULL AND created_at IS NOT NULL
    `, [req.user.company_id]);

    const staleResult = await pool.query(`
      SELECT
        v.id, v.brand, v.model, v.year,
        EXTRACT(DAY FROM NOW() - v.created_at)::INT AS days_in_stock,
        (SELECT vp.url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1) AS photo
      FROM vehicles v
      WHERE v.status = 'available'
        AND v.company_id = $1
        AND v.created_at <= NOW() - INTERVAL '30 days'
      ORDER BY days_in_stock DESC
    `, [req.user.company_id]);

    const brandResult = await pool.query(`
      SELECT brand, COUNT(*) AS count
      FROM vehicles
      WHERE status = 'available' AND company_id = $1 AND brand IS NOT NULL
      GROUP BY brand
      ORDER BY count DESC
    `, [req.user.company_id]);

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
