const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { sendMail, passwordResetHtml } = require('../email');

// POST /api/auth/register — anyone can register, gets role 'cliente'
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nombre, email y contraseña son requeridos' });
    }
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'cliente')
       RETURNING id, name, email, role, active, created_at`,
      [name, email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }
    const user = result.rows[0];
    if (!user.active) {
      return res.status(403).json({ success: false, error: 'Tu cuenta está desactivada. Contactá al administrador.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me — verify token + return fresh user data
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, seller_id, active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile — actualizar nombre y/o contraseña del usuario actual
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, current_password, new_password } = req.body;
    const fields = [];
    const params = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      params.push(name.trim());
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, error: 'Ingresá tu contraseña actual' });
      }
      const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
      if (!valid) {
        return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta' });
      }
      fields.push(`password_hash = $${idx++}`);
      params.push(await bcrypt.hash(new_password, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'Nada que actualizar' });
    }

    params.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, seller_id, active, created_at`,
      params
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/forgot-password — enviar email de recuperación
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });

    const userRes = await pool.query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);
    // Siempre responder OK para no revelar si el email existe
    if (userRes.rows.length === 0) {
      return res.json({ success: true, message: 'Si el email existe, recibirás un enlace.' });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    sendMail({
      to: email,
      subject: 'Recuperar contraseña — Ruedas',
      html: passwordResetHtml({ name: user.name, resetUrl }),
    });

    res.json({ success: true, message: 'Si el email existe, recibirás un enlace.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/reset-password — restablecer contraseña con token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token y contraseña requeridos' });
    }

    const tokenRes = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
    }

    const { user_id, id: tokenId } = tokenRes.rows[0];
    const hash = await bcrypt.hash(password, 10);

    await Promise.all([
      pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]),
      pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]),
    ]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
