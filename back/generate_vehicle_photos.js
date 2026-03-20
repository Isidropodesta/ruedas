/**
 * Script one-shot: genera 6 fotos por vehículo usando Gemini Imagen 3.
 *
 * Uso:
 *   node generate_vehicle_photos.js
 *   node generate_vehicle_photos.js --dry-run   (muestra qué generaría sin llamar la API)
 *   node generate_vehicle_photos.js --id 5       (solo el vehículo con id=5)
 *
 * Requiere en back/.env:
 *   GEMINI_API_KEY=tu_clave_aqui
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('./src/db');

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('\n❌ ERROR: GEMINI_API_KEY no encontrado en .env\n');
  process.exit(1);
}

const DRY_RUN    = process.argv.includes('--dry-run');
const ID_ARG     = (() => { const i = process.argv.indexOf('--id'); return i !== -1 ? parseInt(process.argv[i+1]) : null; })();
const PUBLIC_DIR = path.join(__dirname, '../front/public/autos');
const DELAY_MS   = 800; // entre llamadas para no pisar rate limit

// ── Fotos a generar ───────────────────────────────────────────────────────────

const PHOTOS = [
  {
    file: 'general.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, general view, white background, high quality, photorealistic, car dealership style`,
  },
  {
    file: 'delantera.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, front view, white background, high quality, photorealistic, car dealership style`,
  },
  {
    file: 'trasera.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, rear view, white background, high quality, photorealistic, car dealership style`,
  },
  {
    file: 'lateral-izquierdo.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, left side view, white background, high quality, photorealistic, car dealership style`,
  },
  {
    file: 'lateral-derecho.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, right side view, white background, high quality, photorealistic, car dealership style`,
  },
  {
    file: 'interior.jpg',
    prompt: (year, brand, model, color) =>
      `Professional photo of ${year} ${brand} ${model} in ${color}, interior view, high quality, photorealistic, car dealership style`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Slug seguro para rutas de archivo: minúsculas, espacios → guiones, sin chars especiales
function slug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// Genera una imagen via Gemini Imagen 3 REST API, retorna Buffer
async function callGeminiImagen(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-004:predict?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '16:9',
        safetySetting: 'block_only_high',
        personGeneration: 'dont_allow',
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`API error ${response.status}: ${msg}`);
  }

  const prediction = data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error('Respuesta sin imagen: ' + JSON.stringify(data));
  }

  return Buffer.from(prediction.bytesBase64Encoded, 'base64');
}

// Crea un JPEG placeholder gris con texto (sin dependencias externas)
// Usa un SVG embebido como fallback visual
function createPlaceholderSvg(brand, model, year, angleLabel) {
  const svg = `<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="450" fill="#2a2a2a"/>
  <rect x="1" y="1" width="798" height="448" fill="none" stroke="#444" stroke-width="2"/>
  <text x="400" y="160" font-family="Arial, sans-serif" font-size="64" fill="#555" text-anchor="middle">🚗</text>
  <text x="400" y="240" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#888" text-anchor="middle">${brand} ${model}</text>
  <text x="400" y="275" font-family="Arial, sans-serif" font-size="16" fill="#666" text-anchor="middle">${year}</text>
  <text x="400" y="310" font-family="Arial, sans-serif" font-size="14" fill="#555" text-anchor="middle">${angleLabel}</text>
  <text x="400" y="430" font-family="Arial, sans-serif" font-size="11" fill="#444" text-anchor="middle">Foto no disponible — generada con IA</text>
</svg>`;
  return Buffer.from(svg, 'utf-8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let query = 'SELECT id, brand, model, year, color FROM vehicles ORDER BY id';
  const params = [];
  if (ID_ARG) {
    query = 'SELECT id, brand, model, year, color FROM vehicles WHERE id = $1';
    params.push(ID_ARG);
  }

  const { rows: vehicles } = await pool.query(query, params);

  if (vehicles.length === 0) {
    console.log('No se encontraron vehículos.');
    await pool.end();
    return;
  }

  console.log(`\n🚗 Vehículos a procesar: ${vehicles.length}`);
  if (DRY_RUN) console.log('   [DRY-RUN activo — no se llamará la API ni se escribirán archivos]\n');
  else console.log(`   Directorio destino: ${PUBLIC_DIR}\n`);

  let generated = 0;
  let skipped   = 0;
  let errors    = 0;
  let placeholders = 0;

  for (const v of vehicles) {
    const brandSlug = slug(v.brand);
    const modelSlug = slug(v.model);
    const dir       = path.join(PUBLIC_DIR, brandSlug, modelSlug, String(v.year));

    console.log(`\n📦 ${v.brand} ${v.model} ${v.year} (${v.color || 'sin color'}) — id:${v.id}`);

    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });

    for (const photo of PHOTOS) {
      const filePath   = path.join(dir, photo.file);
      const relUrl     = `/autos/${brandSlug}/${modelSlug}/${v.year}/${photo.file}`;
      const promptText = photo.prompt(v.year, v.brand, v.model, v.color || 'white');

      // Verificar si ya existe en disco
      if (!DRY_RUN && fs.existsSync(filePath)) {
        console.log(`   ⏭  ${photo.file} ya existe, saltando`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`   🔍 [dry] ${photo.file}`);
        console.log(`          prompt: "${promptText.slice(0, 80)}..."`);
        continue;
      }

      process.stdout.write(`   ⏳ ${photo.file} ... `);

      let saved = false;
      try {
        const imgBuffer = await callGeminiImagen(promptText);
        fs.writeFileSync(filePath, imgBuffer);
        console.log('✅');
        generated++;
        saved = true;
      } catch (err) {
        console.log(`❌ ${err.message}`);
        errors++;

        // Guardar placeholder SVG (.svg en vez de .jpg para que no rompa nada)
        const placeholderPath = filePath.replace('.jpg', '.svg');
        try {
          const angleName = photo.file.replace('.jpg', '').replace('-', ' ');
          const svgBuf = createPlaceholderSvg(v.brand, v.model, v.year, angleName);
          fs.writeFileSync(placeholderPath, svgBuf);
          console.log(`   📋 Placeholder guardado: ${photo.file.replace('.jpg', '.svg')}`);
          placeholders++;
        } catch (_) {}
      }

      // Sincronizar con vehicle_photos si se generó la imagen
      if (saved) {
        try {
          // Verificar si ya existe este URL en vehicle_photos
          const exists = await pool.query(
            'SELECT id FROM vehicle_photos WHERE vehicle_id = $1 AND url = $2',
            [v.id, relUrl]
          );
          if (exists.rows.length === 0) {
            await pool.query(
              'INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)',
              [v.id, relUrl]
            );
          }
        } catch (dbErr) {
          console.log(`   ⚠  DB insert fallido para ${photo.file}: ${dbErr.message}`);
        }
      }

      // Esperar entre llamadas para evitar rate limit
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  if (!DRY_RUN) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Generadas:     ${generated}`);
    console.log(`⏭  Saltadas:      ${skipped}`);
    console.log(`📋 Placeholders:  ${placeholders}`);
    console.log(`❌ Errores:       ${errors}`);
    console.log(`${'─'.repeat(50)}\n`);

    if (generated > 0) {
      console.log('💡 Próximos pasos:');
      console.log('   1. git add front/public/autos');
      console.log('   2. git commit -m "Add generated vehicle photos"');
      console.log('   3. git push origin main\n');
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
