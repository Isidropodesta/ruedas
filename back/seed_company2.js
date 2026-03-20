/**
 * Seed: segunda concesionaria "Premium Motors"
 * Crea: empresa, 2 vendedores, 3 usuarios (dueno/vendedor/cliente), 8 vehículos
 * Idempotente: usa ON CONFLICT / IF NOT EXISTS
 */
require('dotenv').config();
const pool = require('./src/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Empresa ────────────────────────────────────────────────────────────
    const coRes = await client.query(`
      INSERT INTO companies (name, slug, active)
      VALUES ('Premium Motors', 'premium', true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `);
    const co = coRes.rows[0];
    console.log(`✅ Empresa: ${co.name} (id:${co.id})`);

    // ── 2. Vendedores ─────────────────────────────────────────────────────────
    const sellers = [
      { name: 'Tomás Ibáñez',   email: 'tomas@premium.com',  phone: '1155001100', hire_date: '2022-03-15' },
      { name: 'Camila Vega',    email: 'camila@premium.com', phone: '1155002200', hire_date: '2023-01-10' },
    ];

    const sellerIds = [];
    for (const s of sellers) {
      const r = await client.query(`
        INSERT INTO sellers (name, email, phone, hire_date, active, company_id)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [s.name, s.email, s.phone, s.hire_date, co.id]);
      if (r.rows.length > 0) {
        sellerIds.push(r.rows[0].id);
        console.log(`   Vendedor: ${s.name} (id:${r.rows[0].id})`);
      } else {
        // Ya existía, buscar su id
        const ex = await client.query('SELECT id FROM sellers WHERE email = $1', [s.email]);
        if (ex.rows.length > 0) sellerIds.push(ex.rows[0].id);
      }
    }

    // ── 3. Usuarios ───────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hash(pw, 10);

    const users = [
      { name: 'Roberto Díaz',  email: 'roberto@premium.com', password: 'dueno123',    role: 'dueno',    seller_id: null },
      { name: 'Tomás Ibáñez',  email: 'tomas@premium.com',   password: 'vendedor123', role: 'vendedor', seller_id: sellerIds[0] || null },
      { name: 'Camila Vega',   email: 'camila@premium.com',  password: 'vendedor123', role: 'vendedor', seller_id: sellerIds[1] || null },
      { name: 'Ana González',  email: 'ana@email.com',        password: 'cliente123',  role: 'cliente',  seller_id: null },
    ];

    for (const u of users) {
      const ph = await hash(u.password);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, seller_id, company_id, active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE
          SET company_id = EXCLUDED.company_id,
              seller_id  = EXCLUDED.seller_id,
              role       = EXCLUDED.role
      `, [u.name, u.email, ph, u.role, u.seller_id, co.id]);
      console.log(`   Usuario: ${u.email} (${u.role})`);
    }

    // ── 4. Vehículos (8) ──────────────────────────────────────────────────────
    const vehicles = [
      { brand: 'Ferrari',    model: 'Roma',       year: 2023, km: 1200,  price_min: 280000000, price_max: 310000000, color: 'Rojo',   type: 'luxury',  seller_id: sellerIds[0], description: 'Ferrari Roma coupé, motor V8 biturbo, impecable.' },
      { brand: 'Lamborghini',model: 'Huracán',    year: 2022, km: 3400,  price_min: 420000000, price_max: 460000000, color: 'Amarillo',type: 'luxury', seller_id: sellerIds[0], description: 'Lamborghini Huracán EVO, V10 5.2L, 640 CV.' },
      { brand: 'Porsche',    model: '911',        year: 2023, km: 800,   price_min: 320000000, price_max: 350000000, color: 'Plata',  type: 'luxury',  seller_id: sellerIds[1], description: 'Porsche 911 Carrera 4S, PDK, paquete Sport Chrono.' },
      { brand: 'Maserati',   model: 'Ghibli',     year: 2021, km: 18000, price_min: 150000000, price_max: 170000000, color: 'Azul',   type: 'luxury',  seller_id: sellerIds[1], description: 'Maserati Ghibli GranSport, 350 CV, full equipo.' },
      { brand: 'Bentley',    model: 'Continental',year: 2022, km: 6500,  price_min: 500000000, price_max: 550000000, color: 'Negro',  type: 'luxury',  seller_id: sellerIds[0], description: 'Bentley Continental GT V8, cuero premium, impecable.' },
      { brand: 'Aston Martin',model: 'Vantage',   year: 2023, km: 2100,  price_min: 380000000, price_max: 410000000, color: 'Verde',  type: 'luxury',  seller_id: sellerIds[1], description: 'Aston Martin Vantage AMR, 510 CV, edición especial.' },
      { brand: 'McLaren',    model: '720S',        year: 2022, km: 4800,  price_min: 450000000, price_max: 490000000, color: 'Naranja',type: 'luxury', seller_id: sellerIds[0], description: 'McLaren 720S, 720 CV, carbono exterior, transmisión SSG.' },
      { brand: 'Rolls-Royce',model: 'Ghost',      year: 2023, km: 900,   price_min: 700000000, price_max: 750000000, color: 'Blanco', type: 'luxury',  seller_id: sellerIds[1], description: 'Rolls-Royce Ghost, V12 biturbo, constelación de estrellas en techo.' },
    ];

    const vehicleIds = [];
    for (const v of vehicles) {
      const r = await client.query(`
        INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, type, status, description, features, company_id, seller_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9, '{}', $10, $11)
        RETURNING id
      `, [v.brand, v.model, v.year, v.km, v.price_min, v.price_max, v.color, v.type, v.description, co.id, v.seller_id]);
      vehicleIds.push({ id: r.rows[0].id, ...v });
      console.log(`   Vehículo: ${v.brand} ${v.model} ${v.year} (id:${r.rows[0].id})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed completado.');
    console.log('\nCredenciales Premium Motors:');
    console.log('  Dueño:    roberto@premium.com  / dueno123');
    console.log('  Vendedor: tomas@premium.com    / vendedor123');
    console.log('  Vendedor: camila@premium.com   / vendedor123');
    console.log('  Cliente:  ana@email.com         / cliente123');
    console.log('\nVehículos creados:', vehicleIds.map(v => `id:${v.id} ${v.brand} ${v.model}`).join(', '));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
