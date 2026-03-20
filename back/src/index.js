process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { auth, optionalAuth, requireRole } = require('./middleware/auth');
const vehiclesRouter = require('./routes/vehicles');
const sellersRouter = require('./routes/sellers');
const kpisRouter = require('./routes/kpis');
const testDrivesRouter = require('./routes/testDrives');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const companiesRouter = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: ['https://ruedas-ochre.vercel.app', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting global — 200 req/minuto por IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intentá en un momento.' },
});
app.use('/api', globalLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Public routes — no auth required
app.use('/api/auth', authRouter);

// Public vehicle detail (shared link)
app.get('/api/public/vehicles/:id', async (req, res) => {
  const pool = require('./db');
  try {
    const { id } = req.params;
    const vehicleResult = await pool.query(
      `SELECT v.id, v.brand, v.model, v.year, v.type, v.status, v.price, v.km,
              v.color, v.description, v.features, v.created_at,
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
    res.json({ success: true, data: vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protected routes — auth required for all
// Vehicles: GET uses optionalAuth (company filter when logged in); writes require auth
app.use('/api/vehicles', (req, res, next) => {
  if (req.method === 'GET') return optionalAuth(req, res, next);
  auth(req, res, next);
}, vehiclesRouter);

// Sellers, KPIs: vendedor+ only
app.use('/api/sellers', auth, requireRole('vendedor', 'dueno'), sellersRouter);
app.use('/api/kpis', auth, requireRole('vendedor', 'dueno'), kpisRouter);

// Test drives: auth required; role enforcement inside router
app.use('/api/test-drives', auth, testDrivesRouter);

// Users: dueno only
app.use('/api/users', auth, requireRole('dueno'), usersRouter);

// Notifications: vendedor+ only
app.use('/api/notifications', auth, requireRole('vendedor', 'dueno'), notificationsRouter);

// Companies: auth required
app.use('/api/companies', auth, companiesRouter);

// Config endpoint (read-only, public)
app.get('/api/config', async (req, res) => {
  const pool = require('./db');
  try {
    const result = await pool.query('SELECT key, value FROM app_config');
    const config = {};
    result.rows.forEach(r => { config[r.key] = r.value; });
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Config update: dueno only
app.put('/api/config', auth, requireRole('dueno'), async (req, res) => {
  const pool = require('./db');
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
        [key, String(value)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
