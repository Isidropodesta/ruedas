require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// Wikipedia article → multiple photos using REST + action API
// Key rule: NEVER modify the URL returned by the API
const vehicles = [
  { id: 1,  articles: ['Toyota_Corolla_(E210)', 'Toyota_Corolla'] },
  { id: 2,  articles: ['Ford_Ranger_(T6)', 'Ford_Ranger'] },
  { id: 3,  articles: ['Mercedes-Benz_C-Class_(W205)', 'Mercedes-Benz_C-Class'] },
  { id: 4,  articles: ['Volkswagen_Amarok'] },
  { id: 5,  articles: ['BMW_3_Series_(G20)', 'BMW_3_Series'] },
  { id: 6,  articles: ['Honda_Civic_(eleventh_generation)', 'Honda_Civic'] },
  { id: 7,  articles: ['Chevrolet_Colorado'] },
  { id: 8,  articles: ['Audi_A4_(B9)', 'Audi_A4'] },
  { id: 9,  articles: ['Renault_Logan'] },
  { id: 10, articles: ['Toyota_Hilux'] },
  { id: 11, articles: ['Peugeot_408'] },
  { id: 12, articles: ['Honda_Jazz'] },
  { id: 13, articles: ['Volkswagen_Polo_(Mk6)', 'Volkswagen_Polo'] },
  { id: 14, articles: ['Renault_Sandero'] },
  { id: 15, articles: ['Fiat_Cronos'] },
  { id: 16, articles: ['Toyota_Etios'] },
  { id: 17, articles: ['Chevrolet_Onix'] },
  { id: 18, articles: ['Peugeot_208'] },
  { id: 19, articles: ['Ford_Transit'] },
  { id: 20, articles: ['Fiat_Fiorino'] },
  { id: 21, articles: ['Renault_Master'] },
  { id: 22, articles: ['Volkswagen_Saveiro', 'Volkswagen_Gol'] },
  { id: 23, articles: ['Nissan_Frontier'] },
  { id: 24, articles: ['BMW_X5_(G05)', 'BMW_X5'] },
  { id: 25, articles: ['Mercedes-Benz_GLE'] },
  { id: 26, articles: ['Audi_Q7'] },
  { id: 27, articles: ['Porsche_Cayenne'] },
  { id: 28, articles: ['Lexus_RX'] },
  { id: 29, articles: ['Volvo_XC90'] },
  { id: 30, articles: ['Toyota_RAV4'] },
  { id: 31, articles: ['Ford_Focus_(fourth_generation)', 'Ford_Focus'] },
  { id: 32, articles: ['Jeep_Renegade'] },
  { id: 33, articles: ['Kia_Sportage'] },
  { id: 34, articles: ['Hyundai_Tucson'] },
  { id: 35, articles: ['Citroën_C3', 'Citro%C3%ABn_C3'] },
  { id: 36, articles: ['Mitsubishi_Triton', 'Mitsubishi_L200'] },
  { id: 37, articles: ['Chevrolet_Tracker_(2019)', 'Chevrolet_Trax'] },
];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RuedasBot/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Get main image from Wikipedia REST summary API (ALWAYS returns a valid cached URL)
async function getRestSummary(article) {
  try {
    const r = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${article}`);
    if (r.status === 200 && r.body) {
      return {
        thumb: r.body.thumbnail?.source || null,
        original: r.body.originalimage?.source || null,
      };
    }
  } catch (e) {}
  return null;
}

// Get multiple images from Wikipedia action API
// Returns thumbnail URLs EXACTLY as given by API (no modification)
async function getArticleImageUrls(article, limit = 8) {
  try {
    // Step 1: get image filenames
    const r1 = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${article}&prop=images&imlimit=${limit}&format=json`);
    if (r1.status !== 200 || !r1.body) return [];

    const pages = Object.values(r1.body.query?.pages || {});
    const images = pages[0]?.images || [];

    // Filter: only JPG, no logos/icons/badges
    const jpgImages = images.filter(img => {
      const f = img.title.toLowerCase();
      return (f.endsWith('.jpg') || f.endsWith('.jpeg'))
        && !f.includes('logo') && !f.includes('icon') && !f.includes('badge')
        && !f.includes('flag') && !f.includes('map') && !f.includes('emblem')
        && !f.includes('signature');
    }).slice(0, 6);

    if (!jpgImages.length) return [];

    await sleep(200);

    // Step 2: get thumbnail URLs - use iiurlwidth=640 and DO NOT modify the returned URL
    const titles = jpgImages.map(i => i.title).join('|');
    const r2 = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json`);
    if (r2.status !== 200 || !r2.body) return [];

    const thumbPages = Object.values(r2.body.query?.pages || {});
    return thumbPages
      .map(p => p.imageinfo?.[0]?.thumburl)
      .filter(Boolean)
      .slice(0, 4);
  } catch (e) {
    return [];
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🖼  Building definitive photo set...\n');

    for (const vehicle of vehicles) {
      process.stdout.write(`[${vehicle.id}] `);
      const allUrls = [];

      // Try each article in order until we get photos
      for (const article of vehicle.articles) {
        if (allUrls.length >= 3) break;

        // 1. Get main image from REST summary (guaranteed valid)
        const summary = await getRestSummary(article);
        await sleep(150);

        if (summary?.thumb && !allUrls.includes(summary.thumb)) {
          allUrls.push(summary.thumb);
        }

        // 2. Get additional images from action API
        if (allUrls.length < 4) {
          const extras = await getArticleImageUrls(article, 10);
          await sleep(200);
          for (const url of extras) {
            if (!allUrls.includes(url) && allUrls.length < 4) {
              allUrls.push(url);
            }
          }
        }
      }

      if (allUrls.length === 0) {
        console.log(`⚠ No photos found`);
        continue;
      }

      // Save to DB
      await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [vehicle.id]);
      for (const url of allUrls) {
        await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)', [vehicle.id, url]);
      }

      console.log(`✅ ${allUrls.length} photos → ${allUrls[0].match(/\/([^/]+)$/)?.[1]?.substring(0, 50)}`);
    }

    console.log('\n🎉 Done! Summary:');
    const r = await client.query(`
      SELECT v.id, v.brand, v.model, COUNT(vp.id) AS n
      FROM vehicles v LEFT JOIN vehicle_photos vp ON vp.vehicle_id = v.id
      GROUP BY v.id, v.brand, v.model ORDER BY v.id
    `);
    r.rows.forEach(row => {
      const ok = parseInt(row.n) >= 2 ? '✅' : '❌';
      console.log(`${ok} [${row.id}] ${row.brand} ${row.model}: ${row.n}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
