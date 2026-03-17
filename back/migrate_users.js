require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'cliente'
          CHECK (role IN ('cliente', 'vendedor', 'dueno')),
        seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla users creada');

    // Dueño por defecto
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Administrador', 'admin@ruedas.com', $1, 'dueno')
      ON CONFLICT (email) DO NOTHING
    `, [hash]);
    console.log('✅ Dueño creado: admin@ruedas.com / admin123');

    // Vendedor de ejemplo
    const hash2 = await bcrypt.hash('vendedor123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Carlos Mendez', 'carlos@ruedas.com', $1, 'vendedor')
      ON CONFLICT (email) DO NOTHING
    `, [hash2]);
    console.log('✅ Vendedor creado: carlos@ruedas.com / vendedor123');

    // Cliente de ejemplo
    const hash3 = await bcrypt.hash('cliente123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Juan García', 'juan@email.com', $1, 'cliente')
      ON CONFLICT (email) DO NOTHING
    `, [hash3]);
    console.log('✅ Cliente creado: juan@email.com / cliente123');

    console.log('\n🎉 Migración completa!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
