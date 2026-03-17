require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// Fixed articles for vehicles that failed
const vehicleArticles = {
  7:  { article: 'Chevrolet_Colorado', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021', '2022'] },
  8:  { article: 'Audi_A4', keywords: ['front', 'rear', 'interior', 'B9', '2019', '2020'] },
  9:  { article: 'Renault_Clio', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  10: { article: 'Toyota_Hilux', keywords: ['front', 'rear', 'interior', 'SR5', '2020', '2021'] },
  12: { article: 'Honda_Jazz', keywords: ['front', 'rear', 'interior', '2020', '2021', 'GR'] },
  14: { article: 'Renault_Clio', keywords: ['front', 'rear', 'interior', '2020', '2021', 'RS'] }, // Sandero-like
  19: { article: 'Ford_Transit', keywords: ['front', 'rear', 'interior', '2016', '2019', '2020', 'van'] },
  22: { article: 'Volkswagen_Caddy', keywords: ['front', 'rear', 'interior', '2020', '2021'] }, // Saveiro-like pickup
  23: { article: 'Nissan_Frontier', keywords: ['front', 'rear', 'interior', '2022', 'Pro-4X'] },
  25: { article: 'Mercedes-Benz_GLE', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  26: { article: 'Audi_Q7', keywords: ['front', 'rear', 'interior', '2020', '2021', '2022'] },
  27: { article: 'Porsche_Cayenne', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021', 'Coupe'] },
  28: { article: 'Lexus_RX', keywords: ['front', 'rear', 'interior', '2016', '2019', '2020', '350'] },
  29: { article: 'Volvo_XC90', keywords: ['front', 'rear', 'interior', '2019', '2020', 'T8'] },
  30: { article: 'Toyota_RAV4', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021', 'XLE'] },
  32: { article: 'Jeep_Renegade', keywords: ['front', 'rear', 'interior', '2019', '2020', 'Limited', 'Trailhawk'] },
  33: { article: 'Kia_Sportage', keywords: ['front', 'rear', 'interior', '2022', 'GT-Line'] },
  34: { article: 'Hyundai_Tucson', keywords: ['front', 'rear', 'interior', '2021', '2022', 'Executive'] },
  35: { article: 'Citro%C3%ABn_C3', keywords: ['front', 'rear', 'interior', '2016', '2017', '2018', '2019'] },
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RuedasBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function scoreImage(filename, keywords) {
  const f = filename.toLowerCase();
  if (f.endsWith('.svg') || f.endsWith('.png') || f.includes('logo') || f.includes('icon')
      || f.includes('flag') || f.includes('map') || f.includes('badge') || f.includes('emblem')
      || f.includes('wheel') || f.includes('engine')) return -1;
  let score = 0;
  for (const kw of keywords) {
    if (f.includes(kw.toLowerCase())) score += 2;
  }
  if (f.endsWith('.jpg') || f.endsWith('.jpeg')) score += 1;
  return score;
}

function pickPhotos(imageList, keywords, count = 4) {
  const scored = imageList
    .filter(img => scoreImage(img.title, keywords) >= 0)
    .map(img => ({ ...img, score: scoreImage(img.title, keywords) }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const usedNames = new Set();

  for (const img of scored) {
    if (selected.length >= count) break;
    if (!usedNames.has(img.title)) {
      selected.push(img.title);
      usedNames.add(img.title);
    }
  }
  if (selected.length < 2) {
    for (const img of imageList) {
      if (selected.length >= count) break;
      const f = img.title.toLowerCase();
      if (!usedNames.has(img.title) && (f.endsWith('.jpg') || f.endsWith('.jpeg'))) {
        selected.push(img.title);
        usedNames.add(img.title);
      }
    }
  }
  return selected.slice(0, count);
}

async function getArticleImages(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${articleTitle}&prop=images&imlimit=30&format=json`;
  try {
    const data = await fetchJSON(url);
    const pages = Object.values(data.query.pages);
    return pages[0]?.images || [];
  } catch (e) {
    console.error(`  ⚠ Failed: ${e.message}`);
    return [];
  }
}

async function getThumbUrls(fileTitles) {
  if (!fileTitles.length) return {};
  const titles = fileTitles.join('|');
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
  try {
    const data = await fetchJSON(url);
    const pages = Object.values(data.query.pages);
    const result = {};
    for (const page of pages) {
      if (page.imageinfo?.[0]?.thumburl) {
        result[page.title] = page.imageinfo[0].thumburl.replace(/\/\d+px-/, '/800px-');
      }
    }
    return result;
  } catch (e) {
    return {};
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing missing vehicle photos...\n');

    for (const [vehicleIdStr, config] of Object.entries(vehicleArticles)) {
      const vehicleId = parseInt(vehicleIdStr);
      console.log(`[${vehicleId}] ${config.article}`);

      const images = await getArticleImages(config.article);
      await sleep(350);
      if (!images.length) { console.log(`  ⚠ No images`); continue; }

      const selectedTitles = pickPhotos(images, config.keywords, 4);
      if (!selectedTitles.length) { console.log(`  ⚠ No suitable images`); continue; }

      const thumbs = await getThumbUrls(selectedTitles);
      await sleep(350);

      const urls = Object.values(thumbs).filter(Boolean);
      if (!urls.length) { console.log(`  ⚠ No thumb URLs`); continue; }

      await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [vehicleId]);
      for (const url of urls) {
        await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)', [vehicleId, url]);
      }
      console.log(`  ✅ ${urls.length} photos`);
    }

    // Manual fallbacks for vehicles with very few photos
    const manualExtras = {
      11: [ // Peugeot 408 - add more from search
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Peugeot_408_%28crossover%29_1X7A8530.jpg/800px-Peugeot_408_%28crossover%29_1X7A8530.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Peugeot_408_II_facelift_01_China.jpg/800px-Peugeot_408_II_facelift_01_China.jpg',
      ],
      37: [ // Chevrolet Tracker extras
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2021_Chevrolet_Tracker_2.0_Premier_%28Brazil%29%2C_front_8.27.21.jpg/800px-2021_Chevrolet_Tracker_2.0_Premier_%28Brazil%29%2C_front_8.27.21.jpg',
      ],
    };
    for (const [idStr, urls] of Object.entries(manualExtras)) {
      const vId = parseInt(idStr);
      for (const url of urls) {
        await client.query(
          'INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [vId, url]
        );
      }
      console.log(`[${vId}] Extra photos added`);
    }

    console.log('\n🎉 Done!');
  } catch (err) {
    console.error('❌', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
