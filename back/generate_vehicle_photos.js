/**
 * Script one-shot: genera 6 fotos por vehículo usando FLUX.1-schnell (Hugging Face).
 *
 * Uso:
 *   node generate_vehicle_photos.js                  → todos los autos
 *   node generate_vehicle_photos.js --id 5           → solo el auto con id=5
 *   node generate_vehicle_photos.js --dry-run        → muestra qué generaría sin llamar la API
 *
 * Requiere en back/.env:
 *   HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('./src/db');

// ── Config ────────────────────────────────────────────────────────────────────

const HF_API_KEY = process.env.HF_API_KEY;
if (!HF_API_KEY) {
  console.error('\n❌ ERROR: HF_API_KEY no encontrado en .env');
  console.error('   Creá una cuenta gratis en https://huggingface.co y generá un token en:');
  console.error('   https://huggingface.co/settings/tokens\n');
  process.exit(1);
}

const DRY_RUN    = process.argv.includes('--dry-run');
const ID_ARG     = (() => { const i = process.argv.indexOf('--id'); return i !== -1 ? parseInt(process.argv[i + 1]) : null; })();
const PUBLIC_DIR = path.join(__dirname, '../front/public/autos');

const HF_MODEL   = 'black-forest-labs/FLUX.1-schnell';
const HF_URL     = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
const DELAY_MS   = 1200;   // pausa entre llamadas para no quemar rate limit
const MAX_RETRIES = 3;     // reintentos si el modelo está cargando (503)
const RETRY_WAIT  = 25000; // espera en ms cuando HF devuelve 503 "model loading"

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

// Negative prompt compartido — le decimos al modelo qué evitar
const NEGATIVE_PROMPT = 'blurry, low quality, watermark, text, logo, people, pedestrians, deformed, ugly, bad anatomy, extra cars, multiple cars';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// Llama HF Inference API y retorna Buffer con la imagen
async function callHuggingFace(prompt, attempt = 1) {
  const response = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt: NEGATIVE_PROMPT,
        width: 1024,
        height: 576,
        num_inference_steps: 4,   // FLUX.1-schnell es óptimo con 4 pasos
        guidance_scale: 0.0,      // schnell usa guidance 0
      },
    }),
  });

  // 503 → modelo todavía cargando, esperar y reintentar
  if (response.status === 503 && attempt <= MAX_RETRIES) {
    const wait = RETRY_WAIT + (attempt - 1) * 10000;
    process.stdout.write(`\n   ⏳ Modelo cargando, esperando ${wait / 1000}s (intento ${attempt}/${MAX_RETRIES})... `);
    await new Promise(r => setTimeout(r, wait));
    return callHuggingFace(prompt, attempt + 1);
  }

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData?.error || errData?.message || JSON.stringify(errData).slice(0, 150);
    } catch (_) {}
    throw new Error(errMsg);
  }

  // HF devuelve la imagen directamente como binario
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Placeholder SVG gris con info del auto y ángulo
function createPlaceholderSvg(brand, model, year, angleFile) {
  const angle = angleFile.replace('.jpg', '').replace(/-/g, ' ');
  return Buffer.from(
    `<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="450" fill="#1e1e1e"/>
  <rect x="2" y="2" width="796" height="446" fill="none" stroke="#333" stroke-width="2"/>
  <text x="400" y="165" font-family="Arial" font-size="72" fill="#444" text-anchor="middle">🚗</text>
  <text x="400" y="245" font-family="Arial" font-size="24" font-weight="bold" fill="#666" text-anchor="middle">${brand} ${model}</text>
  <text x="400" y="278" font-family="Arial" font-size="16" fill="#555" text-anchor="middle">${year}</text>
  <text x="400" y="310" font-family="Arial" font-size="14" fill="#444" text-anchor="middle">${angle}</text>
  <text x="400" y="435" font-family="Arial" font-size="11" fill="#333" text-anchor="middle">Imagen no disponible</text>
</svg>`,
    'utf-8'
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const query  = ID_ARG
    ? 'SELECT id, brand, model, year, color FROM vehicles WHERE id = $1 ORDER BY id'
    : 'SELECT id, brand, model, year, color FROM vehicles ORDER BY id';
  const params = ID_ARG ? [ID_ARG] : [];

  const { rows: vehicles } = await pool.query(query, params);

  if (vehicles.length === 0) {
    console.log('\nNo se encontraron vehículos.\n');
    await pool.end();
    return;
  }

  const totalImages = vehicles.length * PHOTOS.length;
  console.log(`\n🚗 Vehículos: ${vehicles.length}  |  Imágenes máximas: ${totalImages}`);
  console.log(`   Modelo: ${HF_MODEL}`);
  if (DRY_RUN) console.log('   [DRY-RUN — no se llamará la API]\n');
  else         console.log(`   Destino: ${PUBLIC_DIR}\n`);

  let generated    = 0;
  let skipped      = 0;
  let errors       = 0;
  let placeholders = 0;

  for (const v of vehicles) {
    const brandSlug = slug(v.brand);
    const modelSlug = slug(v.model);
    const dir       = path.join(PUBLIC_DIR, brandSlug, modelSlug, String(v.year));
    const color     = v.color || 'white';

    console.log(`\n📦 ${v.brand} ${v.model} ${v.year} — ${color} (id:${v.id})`);

    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });

    for (const photo of PHOTOS) {
      const filePath   = path.join(dir, photo.file);
      const relUrl     = `/autos/${brandSlug}/${modelSlug}/${v.year}/${photo.file}`;
      const promptText = photo.prompt(v.year, v.brand, v.model, color);

      if (!DRY_RUN && fs.existsSync(filePath)) {
        console.log(`   ⏭  ${photo.file} — ya existe`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`   🔍 [dry] ${photo.file}`);
        console.log(`          "${promptText}"`);
        continue;
      }

      process.stdout.write(`   ⏳ ${photo.file} ... `);

      let saved = false;
      try {
        const imgBuffer = await callHuggingFace(promptText);
        fs.writeFileSync(filePath, imgBuffer);
        console.log('✅');
        generated++;
        saved = true;
      } catch (err) {
        console.log(`❌  ${err.message}`);
        errors++;

        // Guardar placeholder SVG como fallback
        try {
          const svgPath = filePath.replace('.jpg', '.svg');
          fs.writeFileSync(svgPath, createPlaceholderSvg(v.brand, v.model, v.year, photo.file));
          placeholders++;
        } catch (_) {}
      }

      // Registrar en vehicle_photos si se generó correctamente
      if (saved) {
        try {
          const { rows } = await pool.query(
            'SELECT id FROM vehicle_photos WHERE vehicle_id = $1 AND url = $2',
            [v.id, relUrl]
          );
          if (rows.length === 0) {
            await pool.query(
              'INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)',
              [v.id, relUrl]
            );
          }
        } catch (dbErr) {
          console.log(`   ⚠  DB insert fallido: ${dbErr.message}`);
        }
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`✅ Generadas:     ${generated}`);
  console.log(`⏭  Saltadas:      ${skipped}`);
  console.log(`📋 Placeholders:  ${placeholders}`);
  console.log(`❌ Errores:       ${errors}`);
  console.log(`${'─'.repeat(52)}\n`);

  if (generated > 0) {
    console.log('💡 Próximos pasos:');
    console.log('   cd .. && git add front/public/autos');
    console.log('   git commit -m "Add generated vehicle photos"');
    console.log('   git push origin main\n');
  }

  await pool.end();
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
