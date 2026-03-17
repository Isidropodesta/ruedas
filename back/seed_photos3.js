require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// All 37 vehicles with specific search queries per angle
const vehicles = [
  { id: 1,  searches: ['Toyota Corolla 2022 front exterior', 'Toyota Corolla 2020 rear', 'Toyota Corolla interior dashboard', 'Toyota Corolla side profile'] },
  { id: 2,  searches: ['Ford Ranger 2020 front exterior', 'Ford Ranger 2019 rear', 'Ford Ranger interior cabin', 'Ford Ranger side view'] },
  { id: 3,  searches: ['Mercedes Benz C Class W205 front', 'Mercedes Benz C Class rear exterior', 'Mercedes Benz C Class interior', 'Mercedes C Class side'] },
  { id: 4,  searches: ['Volkswagen Amarok 2021 front', 'Volkswagen Amarok rear exterior', 'Volkswagen Amarok interior', 'Volkswagen Amarok side'] },
  { id: 5,  searches: ['BMW 3 Series G20 2020 front', 'BMW 3 Series G20 rear', 'BMW 3 Series interior dashboard', 'BMW 330i side'] },
  { id: 6,  searches: ['Honda Civic 2022 front exterior', 'Honda Civic 2022 rear', 'Honda Civic interior dashboard', 'Honda Civic side'] },
  { id: 7,  searches: ['Chevrolet S10 2020 front', 'Chevrolet S10 rear exterior', 'Chevrolet S10 interior', 'Chevrolet Colorado front exterior'] },
  { id: 8,  searches: ['Audi A4 B9 2020 front exterior', 'Audi A4 2020 rear', 'Audi A4 interior dashboard', 'Audi A4 side profile'] },
  { id: 9,  searches: ['Renault Logan 2020 front exterior', 'Renault Logan rear', 'Renault Logan interior', 'Renault Sandero front exterior'] },
  { id: 10, searches: ['Toyota Hilux 2021 front exterior', 'Toyota Hilux rear exterior', 'Toyota Hilux interior', 'Toyota Hilux side profile'] },
  { id: 11, searches: ['Peugeot 408 2022 front exterior', 'Peugeot 408 rear', 'Peugeot 408 interior', 'Peugeot 408 side'] },
  { id: 12, searches: ['Honda Jazz GR 2020 front', 'Honda Jazz 2021 rear', 'Honda Jazz interior dashboard', 'Honda Fit 2020 front exterior'] },
  { id: 13, searches: ['Volkswagen Polo Mk6 front exterior', 'Volkswagen Polo 2020 rear', 'Volkswagen Polo interior', 'Volkswagen Polo side'] },
  { id: 14, searches: ['Renault Sandero 2020 front exterior', 'Renault Sandero rear', 'Renault Sandero interior', 'Renault Sandero side'] },
  { id: 15, searches: ['Fiat Cronos 2020 front exterior', 'Fiat Cronos rear', 'Fiat Cronos interior', 'Fiat Cronos side'] },
  { id: 16, searches: ['Toyota Etios sedan front exterior', 'Toyota Etios rear', 'Toyota Etios interior', 'Toyota Etios side'] },
  { id: 17, searches: ['Chevrolet Onix 2020 front exterior', 'Chevrolet Onix 2020 rear', 'Chevrolet Onix interior', 'Chevrolet Onix side'] },
  { id: 18, searches: ['Peugeot 208 2020 front exterior', 'Peugeot 208 rear', 'Peugeot 208 interior dashboard', 'Peugeot 208 side'] },
  { id: 19, searches: ['Ford Transit 2020 front exterior', 'Ford Transit van rear', 'Ford Transit interior cabin', 'Ford Transit side view'] },
  { id: 20, searches: ['Fiat Fiorino van front', 'Fiat Fiorino rear', 'Fiat Fiorino side', 'Fiat Doblo front exterior'] },
  { id: 21, searches: ['Renault Master 2020 front exterior', 'Renault Master van rear', 'Renault Master interior', 'Renault Master side'] },
  { id: 22, searches: ['Volkswagen Saveiro 2020 front', 'Volkswagen Saveiro rear', 'Volkswagen Saveiro interior', 'VW Saveiro Cross front'] },
  { id: 23, searches: ['Nissan Frontier 2022 front exterior', 'Nissan Frontier rear', 'Nissan Frontier interior', 'Nissan Navara 2020 front exterior'] },
  { id: 24, searches: ['BMW X5 G05 2020 front exterior', 'BMW X5 2020 rear', 'BMW X5 interior dashboard', 'BMW X5 side profile'] },
  { id: 25, searches: ['Mercedes Benz GLE 2020 front exterior', 'Mercedes GLE rear', 'Mercedes GLE interior', 'Mercedes GLE W167 front'] },
  { id: 26, searches: ['Audi Q7 2021 front exterior', 'Audi Q7 rear exterior', 'Audi Q7 interior dashboard', 'Audi Q7 side'] },
  { id: 27, searches: ['Porsche Cayenne 2020 front exterior', 'Porsche Cayenne rear', 'Porsche Cayenne interior', 'Porsche Cayenne side'] },
  { id: 28, searches: ['Lexus RX 350 front exterior', 'Lexus RX rear', 'Lexus RX interior dashboard', 'Lexus RX 350 side'] },
  { id: 29, searches: ['Volvo XC90 2020 front exterior', 'Volvo XC90 rear', 'Volvo XC90 interior', 'Volvo XC90 side'] },
  { id: 30, searches: ['Toyota RAV4 2020 front exterior', 'Toyota RAV4 2020 rear', 'Toyota RAV4 interior', 'Toyota RAV4 side'] },
  { id: 31, searches: ['Ford Focus 2020 front exterior', 'Ford Focus rear', 'Ford Focus interior dashboard', 'Ford Focus side'] },
  { id: 32, searches: ['Jeep Renegade 2021 front exterior', 'Jeep Renegade rear', 'Jeep Renegade interior', 'Jeep Renegade side'] },
  { id: 33, searches: ['Kia Sportage 2022 front exterior', 'Kia Sportage rear', 'Kia Sportage interior', 'Kia Sportage side'] },
  { id: 34, searches: ['Hyundai Tucson 2021 front exterior', 'Hyundai Tucson rear', 'Hyundai Tucson interior', 'Hyundai Tucson side'] },
  { id: 35, searches: ['Citroen C3 2019 front exterior', 'Citroen C3 rear', 'Citroen C3 interior', 'Citroen C3 side'] },
  { id: 36, searches: ['Mitsubishi L200 2020 front exterior', 'Mitsubishi Triton rear', 'Mitsubishi L200 interior', 'Mitsubishi L200 side'] },
  { id: 37, searches: ['Chevrolet Tracker 2021 front exterior', 'Chevrolet Tracker rear', 'Chevrolet Tracker interior', 'Chevrolet Tracker side'] },
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RuedasBot/1.0 (educational project)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'RuedasBot/1.0' } }, (res2) => {
          let data = '';
          res2.on('data', d => data += d);
          res2.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isGoodPhoto(title) {
  const f = title.toLowerCase();
  if (!f.endsWith('.jpg') && !f.endsWith('.jpeg')) return false;
  if (f.includes('logo') || f.includes('icon') || f.includes('badge') || f.includes('emblem')) return false;
  if (f.includes('engine') || f.includes('wheel') || f.includes('tire') || f.includes('detail')) return false;
  if (f.includes('map') || f.includes('flag') || f.includes('chart') || f.includes('graph')) return false;
  return true;
}

async function searchCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=10&format=json`;
  try {
    const data = await fetchJSON(url);
    const results = data.query?.search || [];
    return results.map(r => r.title).filter(isGoodPhoto);
  } catch (e) {
    return [];
  }
}

async function getThumbUrl(fileTitle) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json`;
  try {
    const data = await fetchJSON(url);
    const pages = Object.values(data.query.pages);
    const info = pages[0]?.imageinfo?.[0];
    return info?.thumburl || null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🖼  Building photo library from Wikimedia Commons search...\n');

    for (const vehicle of vehicles) {
      const { id, searches } = vehicle;
      console.log(`\n[${id}] Searching photos...`);

      const photoUrls = [];

      for (const query of searches) {
        if (photoUrls.length >= 4) break;

        const results = await searchCommons(query);
        await sleep(200);

        // Take the first good result from this search
        for (const fileTitle of results) {
          // Skip if we already have a similar file
          const alreadyUsed = photoUrls.length > 0;

          const thumbUrl = await getThumbUrl(fileTitle);
          await sleep(150);

          if (thumbUrl) {
            // Prefer 900px width
            const finalUrl = thumbUrl.replace(/\/\d+px-/, '/900px-');
            photoUrls.push(finalUrl);
            console.log(`  ✅ [${photoUrls.length}] ${fileTitle.substring(5, 60)}`);
            break; // one photo per search query
          }
        }
      }

      if (photoUrls.length === 0) {
        console.log(`  ⚠ No photos found, keeping existing`);
        continue;
      }

      // Replace photos in DB
      await client.query('DELETE FROM vehicle_photos WHERE vehicle_id = $1', [id]);
      for (const url of photoUrls) {
        await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1, $2)', [id, url]);
      }
      console.log(`  → ${photoUrls.length} photos saved for vehicle ${id}`);
    }

    console.log('\n\n🎉 All photos updated!');

    // Summary
    const result = await client.query(`
      SELECT v.id, v.brand, v.model, COUNT(vp.id) as photo_count
      FROM vehicles v
      LEFT JOIN vehicle_photos vp ON vp.vehicle_id = v.id
      GROUP BY v.id, v.brand, v.model
      ORDER BY v.id
    `);
    console.log('\nPhoto count per vehicle:');
    result.rows.forEach(r => console.log(`  [${r.id}] ${r.brand} ${r.model}: ${r.photo_count} photos`));

  } catch (err) {
    console.error('❌', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
