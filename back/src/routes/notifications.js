const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/notifications — últimas 30 notificaciones
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30'
    );
    const unread = result.rows.filter(n => !n.read).length;
    res.json({ success: true, data: result.rows, unread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/read-all — marcar todas como leídas
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE read = FALSE');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: crear notificación (usado internamente)
async function createNotification({ type, title, body, link }) {
  try {
    await pool.query(
      'INSERT INTO notifications (type, title, body, link) VALUES ($1, $2, $3, $4)',
      [type, title, body || null, link || null]
    );
  } catch (err) {
    console.error('[Notifications] Error al crear:', err.message);
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
