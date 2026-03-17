const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const vehiclesRouter = require('./routes/vehicles');
const sellersRouter = require('./routes/sellers');
const kpisRouter = require('./routes/kpis');
const testDrivesRouter = require('./routes/testDrives');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://ruedas-ochre.vercel.app', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/kpis', kpisRouter);
app.use('/api/test-drives', testDrivesRouter);

// Public vehicle detail route (no auth)
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
