const express = require('express');
const router = express.Router();
const path = require('path');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireRole, optionalAuth } = require('../middleware/auth');
const { uploadPhoto } = require('../cloudinary');
const { sendMail, testDriveRequestedHtml } = require('../email');
const { createNotification } = require('./notifications');

const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

const testDriveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Límite de solicitudes de test drive alcanzado. Intentá en 1 hora.' },
});

// GET /api/vehicles - list with filters
router.get('/', async (req, res) => {
  try {
    const { status, type, brand, search, condition, financing_available } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    // If authenticated, scope to their company
    if (req.user?.company_id) {
      conditions.push(`v.company_id = $${idx++}`);
      params.push(req.user.company_id);
    }

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
    if (condition) {
      conditions.push(`v.condition = $${idx++}`);
      params.push(condition);
    }
    if (financing_available === 'true') {
      conditions.push(`v.financing_available = true`);
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
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isManager = req.user && ['vendedor', 'dueno'].includes(req.user.role);

    const vehicleResult = await pool.query(
      `SELECT v.id, v.brand, v.model, v.year, v.type, v.status, v.price, v.km,
              v.color, v.description, v.features, v.seller_id, v.sale_price,
              v.sold_at, v.withdrawal_reason, v.created_at, v.updated_at,
              ${isManager ? 'v.notes_internal,' : ''}
              s.name AS seller_name
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

    // Registrar vista (fire & forget)
    pool.query('INSERT INTO vehicle_views (vehicle_id) VALUES ($1)', [id]).catch(() => {});

    res.json({ success: true, data: vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener vehículo' });
  }
});

// GET /api/vehicles/:id/stats — vistas totales y por período
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const [total, last7, last30, testDrives] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM vehicle_views WHERE vehicle_id = $1', [id]),
      pool.query("SELECT COUNT(*) FROM vehicle_views WHERE vehicle_id = $1 AND viewed_at > NOW() - INTERVAL '7 days'", [id]),
      pool.query("SELECT COUNT(*) FROM vehicle_views WHERE vehicle_id = $1 AND viewed_at > NOW() - INTERVAL '30 days'", [id]),
      pool.query('SELECT COUNT(*) FROM test_drives WHERE vehicle_id = $1', [id]),
    ]);
    res.json({
      success: true,
      data: {
        views_total: parseInt(total.rows[0].count),
        views_7d: parseInt(last7.rows[0].count),
        views_30d: parseInt(last30.rows[0].count),
        test_drives_total: parseInt(testDrives.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/vehicles/bulk-status — cambio masivo de estado
router.put('/bulk-status', requireRole('vendedor', 'dueno'), async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids requeridos' });
    }
    if (!['available', 'withdrawn'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Solo se puede cambiar a available o withdrawn en lote' });
    }
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const query = status === 'withdrawn'
      ? `UPDATE vehicles SET status = $1, withdrawn_at = NOW(), withdrawal_reason = 'Retiro masivo'
         WHERE id IN (${placeholders}) AND status != 'sold' RETURNING id`
      : `UPDATE vehicles SET status = $1, withdrawn_at = NULL, withdrawal_reason = NULL
         WHERE id IN (${placeholders}) RETURNING id`;
    const result = await pool.query(query, [status, ...ids]);
    res.json({ success: true, data: { updated: result.rowCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vehicles/import-csv — importar vehículos desde CSV
router.post('/import-csv', requireRole('vendedor', 'dueno'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Archivo CSV requerido' });
    const fs = require('fs');
    const content = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ success: false, error: 'CSV vacío o sin datos' });

    // Header: brand,model,year,km,price_min,price_max,color,description,type
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const required = ['brand', 'model', 'year', 'type'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Columnas faltantes: ${missing.join(', ')}` });
    }

    const results = { inserted: 0, errors: [] };
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

      if (!row.brand || !row.model || !row.year || !row.type) {
        results.errors.push(`Fila ${i + 1}: brand, model, year y type son requeridos`);
        continue;
      }
      if (!['utility', 'road', 'luxury'].includes(row.type)) {
        results.errors.push(`Fila ${i + 1}: type debe ser utility, road o luxury`);
        continue;
      }
      try {
        await pool.query(
          `INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, description, type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available')`,
          [
            row.brand, row.model,
            parseInt(row.year),
            parseInt(row.km) || 0,
            row.price_min ? parseFloat(row.price_min) : null,
            row.price_max ? parseFloat(row.price_max) : null,
            row.color || null,
            row.description || null,
            row.type,
          ]
        );
        results.inserted++;
      } catch (err) {
        results.errors.push(`Fila ${i + 1}: ${err.message}`);
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vehicles - create vehicle with photo upload
router.post('/', requireRole('vendedor', 'dueno'), upload.array('photos'), async (req, res) => {
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
      `INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, description, type, features, status, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', $11)
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
        JSON.stringify(parsedFeatures),
        req.user.company_id
      ]
    );

    const vehicle = vehicleResult.rows[0];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadPhoto(file.path);
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
router.put('/:id', requireRole('vendedor', 'dueno'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      brand, model, year, km, price_min, price_max,
      color, description, type, features, notes_internal
    } = req.body;

    let parsedFeatures = null;
    if (features !== undefined) {
      try {
        parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch {
        parsedFeatures = {};
      }
    }

    // Check if price changed — fetch current values first
    const priceChanging = price_min !== undefined || price_max !== undefined;
    let currentVehicle = null;
    if (priceChanging) {
      const cur = await client.query('SELECT price_min, price_max FROM vehicles WHERE id = $1', [id]);
      if (cur.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      currentVehicle = cur.rows[0];
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
    if (notes_internal !== undefined) { fields.push(`notes_internal = $${idx++}`); params.push(notes_internal); }

    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    const result = await client.query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // If price changed, insert into price_history
    if (priceChanging && currentVehicle) {
      const newPriceMin = price_min !== undefined ? (price_min ? parseFloat(price_min) : null) : currentVehicle.price_min;
      const newPriceMax = price_max !== undefined ? (price_max ? parseFloat(price_max) : null) : currentVehicle.price_max;
      const oldMin = currentVehicle.price_min;
      const oldMax = currentVehicle.price_max;
      const priceMinChanged = parseFloat(oldMin) !== parseFloat(newPriceMin);
      const priceMaxChanged = parseFloat(oldMax) !== parseFloat(newPriceMax);
      if (priceMinChanged || priceMaxChanged) {
        await client.query(
          `INSERT INTO price_history (vehicle_id, old_price_min, old_price_max, new_price_min, new_price_max)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, oldMin, oldMax, newPriceMin, newPriceMax]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/vehicles/:id/status - change status
router.put('/:id/status', requireRole('vendedor', 'dueno'), async (req, res) => {
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

// GET /api/vehicles/:id/report - get component report
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT component_report FROM vehicles WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, data: result.rows[0].component_report || {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/vehicles/:id/report - save/update component report
router.put('/:id/report', requireRole('vendedor', 'dueno'), async (req, res) => {
  try {
    const { id } = req.params;
    const report = req.body;
    const result = await pool.query(
      'UPDATE vehicles SET component_report = $1 WHERE id = $2 RETURNING component_report',
      [JSON.stringify(report), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, data: result.rows[0].component_report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vehicles/:id/test-drives - list test drives for vehicle
router.get('/:id/test-drives', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT td.*, s.name AS seller_name
       FROM test_drives td
       LEFT JOIN sellers s ON s.id = td.seller_id
       WHERE td.vehicle_id = $1
       ORDER BY td.scheduled_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vehicles/:id/test-drives - create test drive
router.post('/:id/test-drives', testDriveLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { client_name, client_phone, client_email, scheduled_at, notes, seller_id } = req.body;

    if (!client_name || !scheduled_at) {
      return res.status(400).json({ success: false, error: 'client_name and scheduled_at are required' });
    }

    const result = await pool.query(
      `INSERT INTO test_drives (vehicle_id, client_name, client_phone, client_email, scheduled_at, notes, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, client_name, client_phone || null, client_email || null, scheduled_at, notes || null, seller_id || null]
    );

    // Obtener info del vehículo para email/notificación
    const vRes = await pool.query('SELECT brand, model, year FROM vehicles WHERE id = $1', [id]);
    const v = vRes.rows[0] || {};

    // Notificación in-app (fire & forget)
    createNotification({
      type: 'test_drive',
      title: `Nuevo test drive: ${client_name}`,
      body: `${v.brand} ${v.model} ${v.year} — ${new Date(scheduled_at).toLocaleDateString('es-AR')}`,
      link: `/vehicles/${id}`,
    });

    // Email al concesionario (fire & forget)
    if (process.env.NOTIFICATION_EMAIL) {
      sendMail({
        to: process.env.NOTIFICATION_EMAIL,
        subject: `Nuevo Test Drive — ${client_name} · ${v.brand} ${v.model}`,
        html: testDriveRequestedHtml({
          clientName: client_name, clientEmail: client_email,
          clientPhone: client_phone, notes,
          vehicleBrand: v.brand, vehicleModel: v.model, vehicleYear: v.year,
          scheduledAt: scheduled_at,
        }),
      });
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requireRole('dueno'), async (req, res) => {
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

// GET /api/vehicles/:id/price-history - get price history for a vehicle
router.get('/:id/price-history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM price_history WHERE vehicle_id = $1 ORDER BY changed_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/vehicles/:id - public vehicle detail (no auth needed)
// Note: This is mounted under /api/public in index.js
router.get('/public/:id', async (req, res) => {
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

module.exports = router;
