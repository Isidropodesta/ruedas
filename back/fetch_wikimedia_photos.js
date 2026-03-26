/**
 * Descarga fotos de autos desde Wikimedia Commons.
 * Uso:
 *   node fetch_wikimedia_photos.js              → todos
 *   node fetch_wikimedia_photos.js --id 5       → solo id=5
 *   node fetch_wikimedia_photos.js --company 2  → solo empresa id=2
 *   node fetch_wikimedia_photos.js --dry-run    → muestra sin descargar
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const DRY_RUN = process.argv.includes('--dry-run');
const ID_ARG  = (() => { const i = process.argv.indexOf('--id');      return i !== -1 ? parseInt(process.argv[i+1]) : null; })();
const CO_ARG  = (() => { const i = process.argv.indexOf('--company'); return i !== -1 ? parseInt(process.argv[i+1]) : null; })();

const PUBLIC_DIR = path.join(__dirname, '../front/public/autos');
const NAMES      = ['frontal.jpg', 'trasera.jpg', 'lateral.jpg', 'interior.jpg'];
const DELAY_MS   = 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Wikimedia Commons ─────────────────────────────────────────────────────────

async function searchCommons(brand, model, year) {
  const query  = encodeURIComponent(`${brand} ${model} ${year}`);
  const url    = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${query}&srnamespace=6&srlimit=10&format=json&origin=*`;

  const res  = await fetch(url, { headers: { 'User-Agent': 'RuedasApp/1.0 (isidropodesta@gmail.com)' } });
  const data = await res.json();

  const hits = (data?.query?.search || []);

  // Filtrar solo imágenes reales (no SVG, no PDF, no OGG)
  const imgExts = /\.(jpe?g|png|webp)$/i;
  return hits
    .map(h => h.title.replace(/^File:/i, ''))   // "File:Ferrari_Roma.jpg" → "Ferrari_Roma.jpg"
    .filter(name => imgExts.test(name))
    .slice(0, 4);
}

async function downloadImage(filename) {
  const encoded = encodeURIComponent(filename);
  const url     = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RuedasApp/1.0 (isidropodesta@gmail.com)' },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`Imagen muy pequeña (${buf.length} bytes)`);

  return buf;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Traer vehículos
  let vehicles;
  if (ID_ARG) {
    vehicles = await sql`SELECT id, brand, model, year FROM vehicles WHERE id = ${ID_ARG} ORDER BY id`;
  } else if (CO_ARG) {
    vehicles = await sql`SELECT id, brand, model, year FROM vehicles WHERE company_id = ${CO_ARG} ORDER BY id`;
  } else {
    vehicles = await sql`SELECT id, brand, model, year FROM vehicles ORDER BY id`;
  }

  if (!vehicles.length) {
    console.log('No se encontraron vehículos.');
    return;
  }

  console.log(`\nVehículos: ${vehicles.length}`);
  console.log(`Fuente: Wikimedia Commons`);
  if (DRY_RUN) console.log('[DRY-RUN]\n');
  else         console.log(`Destino: ${PUBLIC_DIR}\n`);

  const results = {};

  for (const v of vehicles) {
    const brandSlug = slug(v.brand);
    const modelSlug = slug(v.model);
    const dir       = path.join(PUBLIC_DIR, brandSlug, modelSlug, String(v.year));
    const label     = `${v.brand} ${v.model} ${v.year}`;

    console.log(`\n--- ${label} (id:${v.id}) ---`);

    // Buscar en Commons
    let filenames = [];
    try {
      filenames = await searchCommons(v.brand, v.model, v.year);
      console.log(`  Encontrados: ${filenames.length} archivos`);
      filenames.forEach(f => console.log(`    · ${f}`));
    } catch (err) {
      console.log(`  ERROR búsqueda: ${err.message}`);
    }

    await sleep(DELAY_MS);

    if (DRY_RUN) {
      results[v.id] = { label, found: filenames.length, missing: 4 - filenames.length };
      continue;
    }

    if (filenames.length === 0) {
      results[v.id] = { label, found: [], missing: NAMES };
      continue;
    }

    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });

    const found   = [];
    const missing = [];

    for (let i = 0; i < NAMES.length; i++) {
      const fname   = NAMES[i];
      const srcFile = filenames[i];

      if (!srcFile) {
        missing.push(fname);
        continue;
      }

      const fpath   = path.join(dir, fname);
      const relUrl  = `/autos/${brandSlug}/${modelSlug}/${v.year}/${fname}`;

      // Saltar si ya existe
      if (fs.existsSync(fpath)) {
        console.log(`  ⏭  ${fname} — ya existe`);
        found.push(fname);
        continue;
      }

      process.stdout.write(`  ⏳ ${fname} (${srcFile.slice(0,50)}) ... `);

      try {
        const buf = await downloadImage(srcFile);
        fs.writeFileSync(fpath, buf);
        console.log(`✅ (${Math.round(buf.length/1024)}KB)`);
        found.push(fname);

        // Registrar en DB
        try {
          const existing = await sql`SELECT id FROM vehicle_photos WHERE vehicle_id = ${v.id} AND url = ${relUrl}`;
          if (!existing.length) {
            await sql`INSERT INTO vehicle_photos (vehicle_id, url) VALUES (${v.id}, ${relUrl})`;
          }
        } catch (dbErr) {
          console.log(`  ⚠  DB: ${dbErr.message}`);
        }

        await sleep(DELAY_MS);

      } catch (err) {
        console.log(`❌ ${err.message}`);
        missing.push(fname);
      }
    }

    results[v.id] = { label, found, missing };
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('RESUMEN FINAL');
  console.log(`${'='.repeat(60)}`);

  const all4     = Object.values(results).filter(r => Array.isArray(r.found) && r.found.length === 4);
  const partial  = Object.values(results).filter(r => Array.isArray(r.found) && r.found.length > 0 && r.found.length < 4);
  const noneList = Object.values(results).filter(r => Array.isArray(r.found) && r.found.length === 0);

  console.log(`\n✅ Con las 4 fotos (${all4.length}):`);
  all4.forEach(r => console.log(`   ${r.label}`));

  console.log(`\n⚠  Con fotos parciales (${partial.length}):`);
  partial.forEach(r => {
    console.log(`   ${r.label}`);
    console.log(`      ✓ ${r.found.join(', ')}`);
    console.log(`      ✗ ${r.missing.join(', ')}`);
  });

  console.log(`\n❌ Sin ninguna foto (${noneList.length}):`);
  noneList.forEach(r => console.log(`   ${r.label}`));

  console.log(`\n${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('\nError fatal:', err.message);
  process.exit(1);
});
