require('dotenv').config();
const pool = require('./src/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    // Add notes_internal column to vehicles
    await client.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS notes_internal TEXT;
    `);
    console.log('✓ Added notes_internal column to vehicles');

    // Create price_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
        old_price_min NUMERIC,
        old_price_max NUMERIC,
        new_price_min NUMERIC,
        new_price_max NUMERIC,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Created price_history table');

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
