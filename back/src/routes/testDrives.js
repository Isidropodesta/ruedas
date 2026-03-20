const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../middleware/auth');
const { sendMail, testDriveRequestedHtml, testDriveConfirmedHtml } = require('../email');
const { createNotification } = require('./notifications');

// GET /api/test-drives - list all test drives (vendedor/dueno only)
router.get('/', requireRole('vendedor', 'dueno'), async (req, res) => {
  try {
    const { status } = req.query;
    let query;
    let params = [];

    if (status) {
      query = `
        SELECT td.*,
          s.name AS seller_name,
          v.brand, v.model, v.year,
          (SELECT url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1) AS vehicle_photo
        FROM test_drives td
        LEFT JOIN sellers s ON s.id = td.seller_id
        LEFT JOIN vehicles v ON v.id = td.vehicle_id
        WHERE td.company_id = $1 AND td.status = $2
        ORDER BY td.scheduled_at ASC
      `;
      params = [req.user.company_id, status];
    } else {
      query = `
        SELECT td.*,
          s.name AS seller_name,
          v.brand, v.model, v.year,
          (SELECT url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1) AS vehicle_photo
        FROM test_drives td
        LEFT JOIN sellers s ON s.id = td.seller_id
        LEFT JOIN vehicles v ON v.id = td.vehicle_id
        WHERE td.company_id = $1
        ORDER BY td.scheduled_at ASC
      `;
      params = [req.user.company_id];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/test-drives/mine - get test drives for the current user (by client_email)
router.get('/mine', requireRole('cliente', 'vendedor', 'dueno'), async (req, res) => {
  try {
    const email = req.user.email;
    const result = await pool.query(`
      SELECT td.*,
        v.brand, v.model, v.year,
        (SELECT vp.url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id LIMIT 1) AS vehicle_photo
      FROM test_drives td
      LEFT JOIN vehicles v ON v.id = td.vehicle_id
      WHERE td.client_email = $1 AND td.company_id = $2
      ORDER BY td.scheduled_at DESC
    `, [email, req.user.company_id]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/test-drives/:id/cancel - cliente cancels their own pending test drive
router.put('/:id/cancel', requireRole('cliente', 'vendedor', 'dueno'), async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.user.email;

    // Verify the test drive belongs to this client and is still pending
    const check = await pool.query(
      'SELECT * FROM test_drives WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Turno no encontrado' });
    }
    const td = check.rows[0];

    // Clientes only can cancel their own; vendedor/dueno can cancel any
    if (req.user.role === 'cliente' && td.client_email !== email) {
      return res.status(403).json({ success: false, error: 'No tenés permiso para cancelar este turno' });
    }
    if (td.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Solo se pueden cancelar turnos pendientes' });
    }

    const result = await pool.query(
      'UPDATE test_drives SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/test-drives/:id - update status/notes
router.put('/:id', requireRole('vendedor', 'dueno'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const fields = [];
    const params = [];
    let idx = 1;

    if (status !== undefined) {
      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status. Must be pending, completed, or cancelled.' });
      }
      fields.push(`status = $${idx++}`);
      params.push(status);
    }
    if (notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      params.push(notes);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE test_drives SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test drive not found' });
    }

    const td = result.rows[0];

    // Si cambió el estado, enviar email al cliente (fire & forget)
    if (status && status !== 'pending' && td.client_email) {
      const vRes = await pool.query('SELECT brand, model, year FROM vehicles WHERE id = $1', [td.vehicle_id]);
      const v = vRes.rows[0] || {};
      sendMail({
        to: td.client_email,
        subject: `Tu test drive fue ${status === 'completed' ? 'completado' : 'cancelado'} — ${v.brand} ${v.model}`,
        html: testDriveConfirmedHtml({
          clientName: td.client_name,
          vehicleBrand: v.brand, vehicleModel: v.model, vehicleYear: v.year,
          scheduledAt: td.scheduled_at, status,
        }),
      });
    }

    res.json({ success: true, data: td });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/test-drives/:id - cancel/delete
router.delete('/:id', requireRole('vendedor', 'dueno'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM test_drives WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test drive not found' });
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
