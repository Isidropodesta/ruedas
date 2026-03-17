require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''), ssl: { rejectUnauthorized: false } });

async function main() {
  const r = await pool.query(`
    SELECT v.id, v.brand, v.model, COUNT(vp.id) as n
    FROM vehicles v LEFT JOIN vehicle_photos vp ON vp.vehicle_id = v.id
    GROUP BY v.id, v.brand, v.model ORDER BY v.id
  `);
  r.rows.forEach(row => {
    const ok = parseInt(row.n) >= 3 ? '✅' : parseInt(row.n) >= 2 ? '⚠' : '❌';
    console.log(`${ok} [${row.id}] ${row.brand} ${row.model}: ${row.n} photos`);
  });
  await pool.end();
}
main();
