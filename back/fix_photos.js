require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RuedasBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getThumb(fileTitle) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json`;
  const data = await fetchJSON(url);
  const page = Object.values(data.query.pages)[0];
  const thumb = page?.imageinfo?.[0]?.thumburl;
  return thumb ? thumb.replace(/\/\d+px-/, '/900px-') : null;
}

// Manually curated replacements for vehicles with wrong photos
// Format: { vehicleId, photos: [ array of File: titles to use ] }
const fixes = [
  {
    id: 9, // Renault Logan
    photos: [
      'File:2019 Renault Logan Stepway beige front.jpg',  // front
      'File:2020 Renault Logan Stepway rear.jpg',          // rear
      'File:Renault Logan - Flickr - dave 7.jpg',          // side
      'File:Renault Logan interior 2007 Curitiba.jpg',     // interior
    ]
  },
  {
    id: 10, // Toyota Hilux
    photos: [
      'File:Toyota HiLux GR Sport 1X7A7281.jpg',                    // front
      'File:2023 Toyota Hilux GR Sport D-4D 4WD DCB.jpg',           // front/side
      'File:2021 Toyota Hilux Revo GR Sport Double-Cab 2.8 4x4.jpg', // side
      'File:Toyota Hilux 2.8 GR Sport 2022.jpg',                     // rear/side
    ]
  },
  {
    id: 12, // Honda Fit/Jazz
    photos: [
      'File:2020 Honda Jazz SE i-MMD CVT 1.5 Front.jpg',    // front
      'File:2021 Honda Jazz SE i-MMD CVT 1.5 Rear.jpg',     // rear
      'File:Honda Jazz e HEV (2022) (53322700161).jpg',     // side
      'File:Honda Jazz Interior.jpg',                        // interior
    ]
  },
  {
    id: 14, // Renault Sandero
    photos: [
      'File:Renault Sandero Turbo Stepway Plus (2020) (52710356907).jpg', // front/side
      'File:2022 Renault Sandero Stepway rear.jpg',                        // rear
      'File:Renault Sandero 900T Expression (2016) (52720885119).jpg',    // side
      'File:Interior da porta de um Sandero Stepway modelo 2011.jpg',     // interior
    ]
  },
  {
    id: 22, // Volkswagen Saveiro
    photos: [
      'File:VW Saveiro 1.6 doble cabina 2020 front (cropped).jpg', // front
      'File:VW Saveiro 1.6 doble cabina 2020 rear.jpg',            // rear
      'File:VW Saveiro 1.6 doble cabina 2020 front.jpg',           // front wider
      'File:Saveiro VW.jpg',                                        // side
    ]
  },
  {
    id: 29, // Volvo XC90 - reorder so front is first
    photos: [
      'File:2020 Volvo XC90 T8 R-Design facelift Front.jpg',                          // front
      'File:2020 Volvo XC90 T6 Inscription in Birch Light Metallic, front right.jpg', // 3/4 front
      'File:2020 Volvo XC90 T6 Inscription in Birch Light Metallic, rear right.jpg',  // rear
      'File:Volvo XC90 Ultra SPA FL Charcoal Amber Two-tone (1).jpg',                 // side
    ]
  },
];

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing wrong photos...\n');

    for (const fix of fixes) {
      console.log(`[${fix.id}] Fetching thumb URLs...`);
      const urls = [];

      for (const fileTitle of fix.photos) {
        try {
          const thumb = await getThumb(fileTitle);
          if (thumb) {
            urls.push(thumb);
            console.log(`  ✅ ${fileTitle.substring(5, 65)}`);
          } else {
            console.log(`  ⚠ Not found: ${fileTitle.substring(5, 65)}`);
          }
          await sleep(200);
        } catch (e) {
          console.log(`  ❌ Error: ${e.message}`);
        }
      }

      if (urls.length > 0) {
        await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [fix.id]);
        for (const url of urls) {
          await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)', [fix.id, url]);
        }
        console.log(`  → ${urls.length} photos saved\n`);
      }
    }

    console.log('🎉 Done!');

    // Show final counts for fixed vehicles
    const ids = fixes.map(f => f.id);
    const r = await client.query(`
      SELECT v.id, v.brand, v.model, COUNT(vp.id) as n
      FROM vehicles v LEFT JOIN vehicle_photos vp ON vp.vehicle_id = v.id
      WHERE v.id = ANY($1) GROUP BY v.id, v.brand, v.model ORDER BY v.id
    `, [ids]);
    r.rows.forEach(row => console.log(`  [${row.id}] ${row.brand} ${row.model}: ${row.n} photos`));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
