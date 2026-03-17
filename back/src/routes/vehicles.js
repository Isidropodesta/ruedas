const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require('../db');

const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

// GET /api/vehicles - list with filters
router.get('/', async (req, res) => {
  try {
    const { status, type, brand, search } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`v.status = $${idx++}`);
      params.push(status);
    }
    if (type) {
      conditions.push(`v.type = $${idx++}`);
      params.push(type);
    }
    if (brand) {
      conditions.push(`v.brand ILIKE $${idx++}`);
      params.push(`%${brand}%`);
    }
    if (search) {
      conditions.push(`(v.brand ILIKE $${idx} OR v.model ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT v.*,
        s.name AS seller_name,
        (
          SELECT json_agg(vp.url ORDER BY vp.id)
          FROM vehicle_photos vp
          WHERE vp.vehicle_id = v.id
        ) AS photos
      FROM vehicles v
      LEFT JOIN sellers s ON s.id = v.seller_id
      ${where}
      ORDER BY v.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vehicles/:id - detail with photos and features
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleResult = await pool.query(
      `SELECT v.*, s.name AS seller_name
       FROM vehicles v
       LEFT JOIN sellers s ON s.id = v.seller_id
       WHERE v.id = $1`,
      [id]
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const photosResult = await pool.query(
      'SELECT id, url FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY id',
      [id]
    );

    const vehicle = vehicleResult.rows[0];
    vehicle.photos = photosResult.rows;

    res.json({ success: true, data: vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vehicles - create vehicle with photo upload
router.post('/', upload.array('photos'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      brand, model, year, km, price_min, price_max,
      color, description, type, features
    } = req.body;

    if (!brand || !model || !year || !type) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'brand, model, year and type are required' });
    }

    let parsedFeatures = {};
    if (features) {
      try {
        parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch {
        parsedFeatures = {};
      }
    }

    const vehicleResult = await client.query(
      `INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, description, type, features, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available')
       RETURNING *`,
      [
        brand, model,
        parseInt(year),
        parseInt(km) || 0,
        price_min ? parseFloat(price_min) : null,
        price_max ? parseFloat(price_max) : null,
        color || null,
        description || null,
        type,
        JSON.stringify(parsedFeatures)
      ]
    );

    const vehicle = vehicleResult.rows[0];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = `/uploads/${file.filename}`;
        await client.query(
          'INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)',
          [vehicle.id, url]
        );
      }
    }

    await client.query('COMMIT');

    const photosResult = await pool.query(
      'SELECT id, url FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY id',
      [vehicle.id]
    );
    vehicle.photos = photosResult.rows;

    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/vehicles/:id - update vehicle data
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      brand, model, year, km, price_min, price_max,
      color, description, type, features
    } = req.body;

    let parsedFeatures = null;
    if (features !== undefined) {
      try {
        parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch {
        parsedFeatures = {};
      }
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (brand !== undefined) { fields.push(`brand = $${idx++}`); params.push(brand); }
    if (model !== undefined) { fields.push(`model = $${idx++}`); params.push(model); }
    if (year !== undefined) { fields.push(`year = $${idx++}`); params.push(parseInt(year)); }
    if (km !== undefined) { fields.push(`km = $${idx++}`); params.push(parseInt(km)); }
    if (price_min !== undefined) { fields.push(`price_min = $${idx++}`); params.push(price_min ? parseFloat(price_min) : null); }
    if (price_max !== undefined) { fields.push(`price_max = $${idx++}`); params.push(price_max ? parseFloat(price_max) : null); }
    if (color !== undefined) { fields.push(`color = $${idx++}`); params.push(color); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description); }
    if (type !== undefined) { fields.push(`type = $${idx++}`); params.push(type); }
    if (parsedFeatures !== null) { fields.push(`features = $${idx++}`); params.push(JSON.stringify(parsedFeatures)); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/vehicles/:id/status - change status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, seller_id, sale_price, withdrawal_reason } = req.body;

    if (!status || !['available', 'sold', 'withdrawn'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    let query;
    let params;

    if (status === 'sold') {
      if (!seller_id || !sale_price) {
        return res.status(400).json({ success: false, error: 'seller_id and sale_price are required for sold status' });
      }
      query = `UPDATE vehicles SET status = $1, seller_id = $2, sale_price = $3, sold_at = NOW(), withdrawn_at = NULL, withdrawal_reason = NULL
               WHERE id = $4 RETURNING *`;
      params = [status, seller_id, parseFloat(sale_price), id];
    } else if (status === 'withdrawn') {
      if (!withdrawal_reason) {
        return res.status(400).json({ success: false, error: 'withdrawal_reason is required for withdrawn status' });
      }
      query = `UPDATE vehicles SET status = $1, withdrawal_reason = $2, withdrawn_at = NOW(), sold_at = NULL, sale_price = NULL, seller_id = NULL
               WHERE id = $3 RETURNING *`;
      params = [status, withdrawal_reason, id];
    } else {
      query = `UPDATE vehicles SET status = $1, seller_id = NULL, sale_price = NULL, sold_at = NULL, withdrawn_at = NULL, withdrawal_reason = NULL
               WHERE id = $2 RETURNING *`;
      params = [status, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
