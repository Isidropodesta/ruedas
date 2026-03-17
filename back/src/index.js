const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { auth, requireRole } = require('./middleware/auth');
const vehiclesRouter = require('./routes/vehicles');
const sellersRouter = require('./routes/sellers');
const kpisRouter = require('./routes/kpis');
const testDrivesRouter = require('./routes/testDrives');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://ruedas-ochre.vercel.app', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Public routes — no auth required
app.use('/api/auth', authRouter);

// Public vehicle detail (shared link)
app.get('/api/public/vehicles/:id', async (req, res) => {
  const pool = require('./db');
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

// Protected routes — auth required for all
// Vehicles: any authenticated can read; vendedor/dueno can write (enforced inside router)
app.use('/api/vehicles', auth, vehiclesRouter);

// Sellers, KPIs: vendedor+ only
app.use('/api/sellers', auth, requireRole('vendedor', 'dueno'), sellersRouter);
app.use('/api/kpis', auth, requireRole('vendedor', 'dueno'), kpisRouter);

// Test drives: auth required; role enforcement inside router
app.use('/api/test-drives', auth, testDrivesRouter);

// Users: dueno only (enforced inside router)
app.use('/api/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
