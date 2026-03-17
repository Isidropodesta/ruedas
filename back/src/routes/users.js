const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// All users routes: auth + dueno only
router.use(auth, requireRole('dueno'));

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, seller_id, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users — dueño crea usuarios con cualquier rol
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, seller_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Nombre, email, contraseña y rol son requeridos' });
    }
    if (!['cliente', 'vendedor', 'dueno'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Rol inválido' });
    }
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, seller_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, seller_id, active, created_at`,
      [name, email.toLowerCase(), hash, role, seller_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id — update role, active, name, password
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, active, seller_id, name, password } = req.body;

    const fields = [];
    const params = [];
    let idx = 1;

    if (role !== undefined) {
      if (!['cliente', 'vendedor', 'dueno'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Rol inválido' });
      }
      fields.push(`role = $${idx++}`);
      params.push(role);
    }
    if (active !== undefined) {
      fields.push(`active = $${idx++}`);
      params.push(active);
    }
    if (seller_id !== undefined) {
      fields.push(`seller_id = $${idx++}`);
      params.push(seller_id || null);
    }
    if (name) {
      fields.push(`name = $${idx++}`);
      params.push(name);
    }
    if (password) {
      fields.push(`password_hash = $${idx++}`);
      params.push(await bcrypt.hash(password, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'Nada que actualizar' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, seller_id, active, created_at`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, error: 'No podés eliminar tu propia cuenta' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
