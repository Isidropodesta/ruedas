require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// Each vehicle: primary article + fallback articles for extra images
const vehicles = [
  { id: 1,  brand: 'Toyota Corolla',       articles: ['Toyota_Corolla',     'Toyota_Corolla_(E210)'] },
  { id: 2,  brand: 'Ford Ranger',          articles: ['Ford_Ranger',        'Ford_Ranger_(T6)'] },
  { id: 3,  brand: 'Mercedes C-Class',     articles: ['Mercedes-Benz_C-class', 'Mercedes-Benz_C-Class_(W205)'] },
  { id: 4,  brand: 'VW Amarok',            articles: ['Volkswagen_Amarok'] },
  { id: 5,  brand: 'BMW 3 Series',         articles: ['BMW_3_Series',       'BMW_3_Series_(G20)'] },
  { id: 6,  brand: 'Honda Civic',          articles: ['Honda_Civic',        'Honda_Civic_(eleventh_generation)'] },
  { id: 7,  brand: 'Chevrolet S10',        articles: ['Chevrolet_Colorado', 'Chevrolet_S10_(Latin_America)'] },
  { id: 8,  brand: 'Audi A4',              articles: ['Audi_A4',            'Audi_A4_(B9)'] },
  { id: 9,  brand: 'Renault Logan',        articles: ['Dacia_Logan',        'Renault_Logan'] },
  { id: 10, brand: 'Toyota Hilux',         articles: ['Toyota_Hilux'] },
  { id: 11, brand: 'Peugeot 408',          articles: ['Peugeot_408'] },
  { id: 12, brand: 'Honda Fit',            articles: ['Honda_Jazz',         'Honda_Fit'] },
  { id: 13, brand: 'VW Polo',              articles: ['Volkswagen_Polo'] },
  { id: 14, brand: 'Renault Sandero',      articles: ['Dacia_Sandero',      'Renault_Sandero'] },
  { id: 15, brand: 'Fiat Cronos',          articles: ['Fiat_Cronos'] },
  { id: 16, brand: 'Toyota Etios',         articles: ['Toyota_Etios'] },
  { id: 17, brand: 'Chevrolet Onix',       articles: ['Chevrolet_Onix'] },
  { id: 18, brand: 'Peugeot 208',          articles: ['Peugeot_208'] },
  { id: 19, brand: 'Ford Transit',         articles: ['Ford_Transit'] },
  { id: 20, brand: 'Fiat Fiorino',         articles: ['Fiat_Fiorino'] },
  { id: 21, brand: 'Renault Master',       articles: ['Renault_Master'] },
  { id: 22, brand: 'VW Saveiro',           articles: ['Volkswagen_Saveiro', 'Volkswagen_Gol'] },
  { id: 23, brand: 'Nissan Frontier',      articles: ['Nissan_Frontier',    'Nissan_Navara'] },
  { id: 24, brand: 'BMW X5',              articles: ['BMW_X5',             'BMW_X5_(G05)'] },
  { id: 25, brand: 'Mercedes GLE',         articles: ['Mercedes-Benz_GLE'] },
  { id: 26, brand: 'Audi Q7',             articles: ['Audi_Q7'] },
  { id: 27, brand: 'Porsche Cayenne',      articles: ['Porsche_Cayenne'] },
  { id: 28, brand: 'Lexus RX',            articles: ['Lexus_RX'] },
  { id: 29, brand: 'Volvo XC90',          articles: ['Volvo_XC90'] },
  { id: 30, brand: 'Toyota RAV4',         articles: ['Toyota_RAV4'] },
  { id: 31, brand: 'Ford Focus',          articles: ['Ford_Focus'] },
  { id: 32, brand: 'Jeep Renegade',       articles: ['Jeep_Renegade'] },
  { id: 33, brand: 'Kia Sportage',        articles: ['Kia_Sportage'] },
  { id: 34, brand: 'Hyundai Tucson',      articles: ['Hyundai_Tucson'] },
  { id: 35, brand: 'Citroën C3',          articles: ['Citro%C3%ABn_C3',    'Citro%C3%ABn_C3_(second_generation)'] },
  { id: 36, brand: 'Mitsubishi L200',     articles: ['Mitsubishi_Triton',  'Mitsubishi_L200'] },
  { id: 37, brand: 'Chevrolet Tracker',   articles: ['Chevrolet_Trax',     'Chevrolet_Tracker'] },
];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CarsBot/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(data) }); }
        catch (e) { resolve({ s: res.statusCode, b: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// pageimages: returns the Wikipedia article's main image at a real cached size
async function getPageImage(article) {
  try {
    const r = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${article}&prop=pageimages&pithumbsize=640&format=json`);
    if (r.s !== 200 || !r.b) return null;
    const page = Object.values(r.b.query.pages)[0];
    return page?.thumbnail?.source || null;
  } catch (e) { return null; }
}

// Extra images from article (use returned URL as-is, no size change)
async function getExtraImages(article, existing = []) {
  try {
    const r1 = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${article}&prop=images&imlimit=20&format=json`);
    if (r1.s !== 200 || !r1.b) return [];

    const imgs = Object.values(r1.b.query.pages)[0]?.images || [];
    const filtered = imgs.filter(i => {
      const f = i.title.toLowerCase();
      return (f.endsWith('.jpg') || f.endsWith('.jpeg'))
        && !f.includes('logo') && !f.includes('icon') && !f.includes('badge')
        && !f.includes('emblem') && !f.includes('flag') && !f.includes('signature')
        && !f.includes('map') && !f.includes('coat_of') && !f.includes('seal_of');
    }).slice(0, 8);

    if (!filtered.length) return [];
    await sleep(200);

    const titles = filtered.map(i => i.title).join('|');
    const r2 = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json`);
    if (r2.s !== 200 || !r2.b) return [];

    return Object.values(r2.b.query.pages)
      .map(p => p.imageinfo?.[0]?.thumburl)
      .filter(u => u && !existing.includes(u))
      .slice(0, 3);
  } catch (e) { return []; }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('📸 Final photo build using pageimages API (guaranteed cached URLs)\n');

    for (const v of vehicles) {
      process.stdout.write(`[${v.id}] ${v.brand}... `);
      const urls = [];

      for (const article of v.articles) {
        if (urls.length >= 4) break;

        // Main image via pageimages (always cached)
        const main = await getPageImage(article);
        await sleep(200);
        if (main && !urls.includes(main)) urls.push(main);

        // Additional images
        if (urls.length < 4) {
          const extras = await getExtraImages(article, urls);
          await sleep(200);
          for (const u of extras) {
            if (!urls.includes(u) && urls.length < 4) urls.push(u);
          }
        }
      }

      if (urls.length === 0) {
        console.log('⚠ no photos');
        continue;
      }

      await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [v.id]);
      for (const url of urls) {
        await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)', [v.id, url]);
      }
      console.log(`✅ ${urls.length} photos`);
    }

    console.log('\n✅ All done!');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
