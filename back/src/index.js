const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const vehiclesRouter = require('./routes/vehicles');
const sellersRouter = require('./routes/sellers');
const kpisRouter = require('./routes/kpis');

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
