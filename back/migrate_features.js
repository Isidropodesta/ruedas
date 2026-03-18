// migrate_features.js — crea las tablas nuevas para las nuevas funcionalidades
// Ejecutar con: node migrate_features.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Ejecutando migraciones...\n');

  // 1. vehicle_views — conteo de vistas por vehículo
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_views (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vehicle_views_vehicle_id ON vehicle_views(vehicle_id);
  `);
  console.log('✅ vehicle_views');

  // 2. notifications — notificaciones in-app para vendedores/dueños
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      link VARCHAR(255),
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ notifications');

  // 3. password_reset_tokens — para recuperar contraseña
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ password_reset_tokens');

  // 4. Agregar columna whatsapp_number a configuración global (en vehicles si no existe)
  // Usamos una tabla de configuración general
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO app_config (key, value) VALUES ('whatsapp_number', '') ON CONFLICT (key) DO NOTHING;
    INSERT INTO app_config (key, value) VALUES ('dealership_name', 'Ruedas Concesionaria') ON CONFLICT (key) DO NOTHING;
    INSERT INTO app_config (key, value) VALUES ('stock_alert_days', '60') ON CONFLICT (key) DO NOTHING;
  `);
  console.log('✅ app_config');

  console.log('\n✅ Todas las migraciones completadas.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
