const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/sellers - list all sellers with sold count
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        COUNT(v.id) FILTER (WHERE v.status = 'sold') AS vehicles_sold,
        COALESCE(SUM(v.sale_price) FILTER (WHERE v.status = 'sold'), 0) AS total_revenue
      FROM sellers s
      LEFT JOIN vehicles v ON v.seller_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sellers/:id - detail with stats
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sellerResult = await pool.query('SELECT * FROM sellers WHERE id = $1', [id]);
    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sold') AS vehicles_sold,
        COALESCE(SUM(sale_price) FILTER (WHERE status = 'sold'), 0) AS total_revenue,
        COALESCE(AVG(sale_price) FILTER (WHERE status = 'sold'), 0) AS avg_ticket,
        COUNT(*) FILTER (
          WHERE status = 'sold'
          AND DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', NOW())
        ) AS vehicles_sold_this_month,
        COUNT(*) FILTER (
          WHERE status = 'sold'
          AND DATE_TRUNC('year', sold_at) = DATE_TRUNC('year', NOW())
        ) AS vehicles_sold_this_year
      FROM vehicles
      WHERE seller_id = $1
    `, [id]);

    const vehiclesResult = await pool.query(`
      SELECT v.id, v.brand, v.model, v.year, v.type, v.sale_price, v.sold_at,
        (
          SELECT vp.url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1
        ) AS photo
      FROM vehicles v
      WHERE v.seller_id = $1 AND v.status = 'sold'
      ORDER BY v.sold_at DESC
    `, [id]);

    const seller = sellerResult.rows[0];
    seller.stats = statsResult.rows[0];
    seller.vehicles = vehiclesResult.rows;

    res.json({ success: true, data: seller });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sellers - create seller
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, hire_date } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const result = await pool.query(
      `INSERT INTO sellers (name, email, phone, hire_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email || null, phone || null, hire_date || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/sellers/:id - update seller
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, hire_date } = req.body;

    const fields = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); params.push(email); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(phone); }
    if (hire_date !== undefined) { fields.push(`hire_date = $${idx++}`); params.push(hire_date); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE sellers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/sellers/:id/toggle - toggle active status
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE sellers SET active = NOT active WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
