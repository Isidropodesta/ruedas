const express = require('express');
const router = express.Router();
const pool = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/companies/public — lista pública de empresas activas (sin auth)
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, logo_url FROM companies WHERE active = true ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/companies/me — returns the company of the authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, logo_url, active, created_at FROM companies WHERE id = $1',
      [req.user.company_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
