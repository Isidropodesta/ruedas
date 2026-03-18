// seed_users.js — inserta usuarios de prueba en la base de datos
// Ejecutar con: node seed_users.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

const PASSWORD_HASH = bcrypt.hashSync('123456', 10); // todos usan la misma contraseña: 123456

const clientes = [
  // Nombre,                 email
  ['Sofía Martínez',        'sofia.martinez@gmail.com'],
  ['Lucas Fernández',       'lucas.fernandez@gmail.com'],
  ['Valentina López',       'valentina.lopez@hotmail.com'],
  ['Mateo García',          'mateo.garcia@gmail.com'],
  ['Camila Rodríguez',      'camila.rodriguez@outlook.com'],
  ['Santiago Pérez',        'santiago.perez@gmail.com'],
  ['Isabella Torres',       'isabella.torres@gmail.com'],
  ['Nicolás Ramírez',       'nicolas.ramirez@yahoo.com'],
  ['Martina Flores',        'martina.flores@gmail.com'],
  ['Agustín Morales',       'agustin.morales@gmail.com'],
  ['Lucía Herrera',         'lucia.herrera@hotmail.com'],
  ['Tomás Díaz',            'tomas.diaz@gmail.com'],
  ['Emma Vargas',           'emma.vargas@gmail.com'],
  ['Facundo Castro',        'facundo.castro@outlook.com'],
  ['Paula Jiménez',         'paula.jimenez@gmail.com'],
  ['Julián Ruiz',           'julian.ruiz@gmail.com'],
  ['Ana Romero',            'ana.romero@hotmail.com'],
  ['Ignacio Álvarez',       'ignacio.alvarez@gmail.com'],
  ['Florencia Sánchez',     'florencia.sanchez@gmail.com'],
  ['Rodrigo Guerrero',      'rodrigo.guerrero@yahoo.com'],
  ['Milagros Navarro',      'milagros.navarro@gmail.com'],
  ['Franco Medina',         'franco.medina@gmail.com'],
  ['Rocío Molina',          'rocio.molina@outlook.com'],
  ['Braian Sosa',           'braian.sosa@gmail.com'],
  ['Magali Ortiz',          'magali.ortiz@gmail.com'],
  ['Ezequiel Cruz',         'ezequiel.cruz@gmail.com'],
  ['Cintia Cabrera',        'cintia.cabrera@hotmail.com'],
  ['Kevin Mendoza',         'kevin.mendoza@gmail.com'],
  ['Daniela Ríos',          'daniela.rios@gmail.com'],
  ['Leandro Peralta',       'leandro.peralta@outlook.com'],
];

async function seed() {
  console.log('Insertando usuarios...\n');
  let inserted = 0;
  let skipped = 0;

  for (const [name, email] of clientes) {
    try {
      const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (exists.rows.length > 0) {
        console.log(`  ⚠️  Ya existe: ${email}`);
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, active)
         VALUES ($1, $2, $3, 'cliente', true)`,
        [name, email, PASSWORD_HASH]
      );
      console.log(`  ✅ ${name} — ${email}`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ Error con ${email}:`, err.message);
    }
  }

  console.log(`\nListo: ${inserted} insertados, ${skipped} ya existían.`);
  console.log('Contraseña de todos: 123456');
  await pool.end();
}

seed().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
