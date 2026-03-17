require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// For each vehicle: Wikipedia article title + optional preferred image keywords
const vehicleArticles = {
  1:  { article: 'Toyota_Corolla_(E210)', keywords: ['front', 'rear', 'interior', 'SE'] },
  2:  { article: 'Ford_Ranger_(T6)', keywords: ['front', 'rear', 'interior', 'Wildtrak', 'XLT'] },
  3:  { article: 'Mercedes-Benz_C-Class_(W205)', keywords: ['front', 'rear', 'interior'] },
  4:  { article: 'Volkswagen_Amarok', keywords: ['front', 'rear', 'interior', '2016', '2017', '2018', '2019', '2020', '2021'] },
  5:  { article: 'BMW_3_Series_(G20)', keywords: ['front', 'rear', 'interior'] },
  6:  { article: 'Honda_Civic_(eleventh_generation)', keywords: ['front', 'rear', 'interior'] },
  7:  { article: 'Chevrolet_S10_(second_generation)', keywords: ['front', 'rear', 'interior'] },
  8:  { article: 'Audi_A4_(B9)', keywords: ['front', 'rear', 'interior'] },
  9:  { article: 'Renault_Logan', keywords: ['front', 'rear', 'interior', '2013', '2014', '2018', '2019'] },
  10: { article: 'Toyota_Hilux_(eighth_generation)', keywords: ['front', 'rear', 'interior', 'SR5'] },
  11: { article: 'Peugeot_408', keywords: ['front', 'rear', 'interior', '2022', '2023'] },
  12: { article: 'Honda_Jazz_(GR)', keywords: ['front', 'rear', 'interior'] },
  13: { article: 'Volkswagen_Polo_Mk6', keywords: ['front', 'rear', 'interior'] },
  14: { article: 'Renault_Sandero', keywords: ['front', 'rear', 'interior', '2013', '2019', '2020'] },
  15: { article: 'Fiat_Cronos', keywords: ['front', 'rear', 'interior', '2018', '2019', '2020'] },
  16: { article: 'Toyota_Etios', keywords: ['front', 'rear', 'interior', 'sedan'] },
  17: { article: 'Chevrolet_Onix', keywords: ['front', 'rear', 'interior', '2020', '2021'] },
  18: { article: 'Peugeot_208', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  19: { article: 'Ford_Transit_(sixth_generation)', keywords: ['front', 'rear', 'interior', '2016', '2019', '2020'] },
  20: { article: 'Fiat_Fiorino', keywords: ['front', 'rear', '2008', '2012', '2016', '2020'] },
  21: { article: 'Renault_Master', keywords: ['front', 'rear', 'van', 'box', 'T28'] },
  22: { article: 'Volkswagen_Saveiro', keywords: ['front', 'rear', 'interior', 'G6', 'G7', 'Cross'] },
  23: { article: 'Nissan_Frontier_(D41)', keywords: ['front', 'rear', 'interior', '2022'] },
  24: { article: 'BMW_X5_(G05)', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  25: { article: 'Mercedes-Benz_GLE_(W167)', keywords: ['front', 'rear', 'interior', '2020', '2021'] },
  26: { article: 'Audi_Q7_(4M)', keywords: ['front', 'rear', 'interior', '2020', '2021', '2022', '2023'] },
  27: { article: 'Porsche_Cayenne_(E3)', keywords: ['front', 'rear', 'interior', '2018', '2019', '2020'] },
  28: { article: 'Lexus_RX_(AL20)', keywords: ['front', 'rear', 'interior', '2016', '2017', '2019'] },
  29: { article: 'Volvo_XC90_(second_generation)', keywords: ['front', 'rear', 'interior', '2019', '2020'] },
  30: { article: 'Toyota_RAV4_(XA50)', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  31: { article: 'Ford_Focus_(fourth_generation)', keywords: ['front', 'rear', 'interior', '2019', '2020'] },
  32: { article: 'Jeep_Renegade_(BU)', keywords: ['front', 'rear', 'interior', '2019', '2020', '2021'] },
  33: { article: 'Kia_Sportage_(NQ5)', keywords: ['front', 'rear', 'interior', '2022'] },
  34: { article: 'Hyundai_Tucson_(NX4)', keywords: ['front', 'rear', 'interior', '2021', '2022'] },
  35: { article: 'Citroën_C3_(second_generation)', keywords: ['front', 'rear', 'interior', '2016', '2017', '2018', '2019'] },
  36: { article: 'Mitsubishi_Triton', keywords: ['front', 'rear', 'interior', '2019', '2020', 'L200'] },
  37: { article: 'Chevrolet_Tracker_(2019)', keywords: ['front', 'rear', 'interior', '2020', '2021', '2022'] },
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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Score an image filename — higher = more relevant
function scoreImage(filename, keywords) {
  const f = filename.toLowerCase();
  // Skip SVG, icons, logos, flags, maps
  if (f.endsWith('.svg') || f.endsWith('.png') || f.includes('logo') || f.includes('icon')
      || f.includes('flag') || f.includes('map') || f.includes('badge') || f.includes('emblem')
      || f.includes('wheel') || f.includes('engine') || f.includes('badge')) return -1;

  let score = 0;
  for (const kw of keywords) {
    if (f.includes(kw.toLowerCase())) score += 2;
  }
  // Prefer JPG
  if (f.endsWith('.jpg') || f.endsWith('.jpeg')) score += 1;
  return score;
}

function pickPhotos(imageList, keywords, count = 4) {
  // Filter and score
  const scored = imageList
    .filter(img => scoreImage(img.title, keywords) >= 0)
    .map(img => ({ ...img, score: scoreImage(img.title, keywords) }))
    .sort((a, b) => b.score - a.score);

  // Try to get a variety: prefer images with different angles
  const selected = [];
  const usedNames = new Set();

  // First pass: pick images with keyword matches
  for (const img of scored) {
    if (selected.length >= count) break;
    if (!usedNames.has(img.title)) {
      selected.push(img.title);
      usedNames.add(img.title);
    }
  }

  // If we don't have enough, take any remaining JPGs
  if (selected.length < 2) {
    for (const img of imageList) {
      if (selected.length >= count) break;
      const f = img.title.toLowerCase();
      if (!usedNames.has(img.title) && (f.endsWith('.jpg') || f.endsWith('.jpeg'))
          && !f.includes('svg') && !f.includes('logo') && !f.includes('icon')) {
        selected.push(img.title);
        usedNames.add(img.title);
      }
    }
  }

  return selected.slice(0, count);
}

async function getArticleImages(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=images&imlimit=30&format=json`;
  try {
    const data = await fetchJSON(url);
    const pages = Object.values(data.query.pages);
    if (!pages[0] || !pages[0].images) return [];
    return pages[0].images || [];
  } catch (e) {
    console.error(`  ⚠ Failed to fetch article images for ${articleTitle}: ${e.message}`);
    return [];
  }
}

async function getThumbUrls(fileTitles) {
  if (!fileTitles.length) return [];
  const titles = fileTitles.map(t => t.replace('File:', '')).map(t => `File:${t}`).join('|');
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
  try {
    const data = await fetchJSON(url);
    const pages = Object.values(data.query.pages);
    const result = {};
    for (const page of pages) {
      if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].thumburl) {
        // Normalize to 800px width
        const thumb = page.imageinfo[0].thumburl.replace(/\/\d+px-/, '/800px-');
        result[page.title] = thumb;
      }
    }
    return result;
  } catch (e) {
    console.error(`  ⚠ Failed to fetch thumb URLs: ${e.message}`);
    return {};
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🖼  Fetching real car photos from Wikipedia...\n');

    // Process each vehicle
    for (const [vehicleIdStr, config] of Object.entries(vehicleArticles)) {
      const vehicleId = parseInt(vehicleIdStr);
      console.log(`\n[${vehicleId}] ${config.article}`);

      // 1. Get image list from Wikipedia article
      const images = await getArticleImages(config.article);
      await sleep(300); // be nice to Wikipedia API

      if (!images.length) {
        console.log(`  ⚠ No images found for article`);
        continue;
      }

      // 2. Pick best 4 images
      const selectedTitles = pickPhotos(images, config.keywords, 4);
      if (!selectedTitles.length) {
        console.log(`  ⚠ No suitable images after filtering`);
        continue;
      }

      // 3. Get actual thumb URLs (batch of up to 4)
      const thumbs = await getThumbUrls(selectedTitles);
      await sleep(300);

      const urls = Object.values(thumbs).filter(Boolean);
      if (!urls.length) {
        console.log(`  ⚠ Could not resolve thumb URLs`);
        continue;
      }

      // 4. Delete existing photos and insert new ones
      await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [vehicleId]);
      for (const url of urls) {
        await client.query(
          'INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)',
          [vehicleId, url]
        );
      }
      console.log(`  ✅ ${urls.length} photos inserted`);
      urls.forEach(u => console.log(`     ${u.substring(0, 90)}...`));
    }

    console.log('\n🎉 All vehicle photos updated!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
