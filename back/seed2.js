require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

const componentReport = () => ({
  motor: 'bueno', transmision: 'bueno', frenos: 'bueno', suspension: 'regular',
  direccion: 'bueno', neumaticos: 'regular', bateria: 'bueno', luces: 'bueno',
  ac: 'bueno', carroceria: 'bueno', interior: 'bueno', sistema_electrico: 'bueno',
  escape: 'bueno', radiador: 'bueno', amortiguadores: 'regular', embrague: 'bueno',
  diferencial: 'bueno',
});

const moreAvailableVehicles = [
  { brand: 'Toyota', model: 'RAV4', year: 2023, km: 15000, price_min: 42000, price_max: 48000, color: 'Gris', type: 'luxury', description: 'SUV híbrido, excelente para familia.', features: { puertas: 5, bluetooth: true, combustible: 'hibrido', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, km_autonomia: 750 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/2019_Toyota_RAV4_XLE_%28facelift%2C_white%29%2C_front_5.3.19.jpg/320px-2019_Toyota_RAV4_XLE_%28facelift%2C_white%29%2C_front_5.3.19.jpg' },
  { brand: 'Ford', model: 'Focus', year: 2022, km: 29000, price_min: 17000, price_max: 20000, color: 'Azul', type: 'road', description: 'Hatchback ágil, equipamiento completo.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, camara_reversa: true, consumo_l100km: 7.2, autonomia_km: 560 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Ford_Focus_Mk4_SE_1.5T_EcoBoost_%28facelift%29.jpg/320px-Ford_Focus_Mk4_SE_1.5T_EcoBoost_%28facelift%29.jpg' },
  { brand: 'Jeep', model: 'Renegade', year: 2023, km: 11000, price_min: 32000, price_max: 37000, color: 'Negro', type: 'luxury', description: '4x4 compacto, ideal para aventuras.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, asientos_cuero: false, km_autonomia: 500 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/2019_Jeep_Renegade_Limited_in_Diamond_Black_Crystal%2C_front_left.jpg/320px-2019_Jeep_Renegade_Limited_in_Diamond_Black_Crystal%2C_front_left.jpg' },
  { brand: 'Kia', model: 'Sportage', year: 2022, km: 24000, price_min: 30000, price_max: 35000, color: 'Blanco', type: 'luxury', description: 'SUV coreano, confiable y moderno.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, asientos_cuero: true, km_autonomia: 520 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/2022_Kia_Sportage_GT-Line_1.6_CRDi_ISG_%28front%29.jpg/320px-2022_Kia_Sportage_GT-Line_1.6_CRDi_ISG_%28front%29.jpg' },
  { brand: 'Hyundai', model: 'Tucson', year: 2021, km: 38000, price_min: 27000, price_max: 31000, color: 'Gris', type: 'luxury', description: 'Diseño moderno, bajo costo de mantenimiento.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, asientos_cuero: false, km_autonomia: 490 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/2021_Hyundai_Tucson_Executive_2.0_Front.jpg/320px-2021_Hyundai_Tucson_Executive_2.0_Front.jpg' },
  { brand: 'Citroën', model: 'C3', year: 2022, km: 19000, price_min: 14000, price_max: 16500, color: 'Rojo', type: 'road', description: 'Urbano y versátil, diseño francés.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, camara_reversa: false, consumo_l100km: 6.7, autonomia_km: 570 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Citro%C3%ABn_C3_Aircross_Feel_Pack_1.5_BlueHDi_110_EAT6_S%26S_%28II%29_%E2%80%93_Frontansicht%2C_29._Juli_2018%2C_D%C3%BCsseldorf.jpg/320px-Citro%C3%ABn_C3_Aircross_Feel_Pack_1.5_BlueHDi_110_EAT6_S%26S_%28II%29_%E2%80%93_Frontansicht%2C_29._Juli_2018%2C_D%C3%BCsseldorf.jpg' },
  { brand: 'Mitsubishi', model: 'L200', year: 2022, km: 45000, price_min: 36000, price_max: 42000, color: 'Blanco', type: 'utility', description: 'Pick-up 4x4, alta capacidad de carga.', features: { puertas: 4, bluetooth: true, combustible: 'diesel', transmision: 'manual', aire_acondicionado: true, carga_kg: 1000, volumen_m3: 1.5 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/2019_Mitsubishi_L200_Series_6_2.3_DiD_DoKa_Intense_4WD_%28rear%29.jpg/320px-2019_Mitsubishi_L200_Series_6_2.3_DiD_DoKa_Intense_4WD_%28rear%29.jpg' },
  { brand: 'Chevrolet', model: 'Tracker', year: 2023, km: 6000, price_min: 26000, price_max: 30000, color: 'Azul', type: 'luxury', description: 'SUV compacto, tecnología 2023.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, asientos_cuero: false, km_autonomia: 510 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2021_Chevrolet_Tracker_2.0_Premier_%28Brazil%29%2C_front_8.27.21.jpg/320px-2021_Chevrolet_Tracker_2.0_Premier_%28Brazil%29%2C_front_8.27.21.jpg' },
];

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing prices and adding more vehicles...\n');

    // Fix ARS prices for old sold vehicles
    await client.query(`UPDATE vehicles SET sale_price=45000, price_min=40000, price_max=50000 WHERE id=3`);
    await client.query(`UPDATE vehicles SET sale_price=22000, price_min=18000, price_max=24000 WHERE id=6`);
    await client.query(`UPDATE vehicles SET sale_price=38000, price_min=34000, price_max=42000 WHERE id=10`);
    console.log('  ✅ Fixed sale prices for vehicles 3, 6, 10');

    // Fix existing vehicle prices (price_min/max)
    await client.query(`UPDATE vehicles SET price_min=16000, price_max=21000 WHERE id=1`);  // Corolla
    await client.query(`UPDATE vehicles SET price_min=30000, price_max=38000 WHERE id=2`);  // Ranger
    await client.query(`UPDATE vehicles SET price_min=55000, price_max=65000 WHERE id=5`);  // BMW S3
    await client.query(`UPDATE vehicles SET price_min=32000, price_max=40000 WHERE id=7`);  // S10
    await client.query(`UPDATE vehicles SET price_min=55000, price_max=68000 WHERE id=8`);  // Audi A4
    console.log('  ✅ Fixed price_min/max for original vehicles');

    // Add more available vehicles
    const insertedIds = [];
    for (const v of moreAvailableVehicles) {
      const { photo, features, ...rest } = v;
      const result = await client.query(
        `INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, type, description, features, status, component_report)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'available',$11) RETURNING id`,
        [rest.brand, rest.model, rest.year, rest.km, rest.price_min, rest.price_max, rest.color, rest.type, rest.description,
         JSON.stringify(features), JSON.stringify(componentReport())]
      );
      const vId = result.rows[0].id;
      insertedIds.push(vId);
      await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1,$2)', [vId, photo]);
      console.log(`  ✅ Added: ${vId} ${rest.brand} ${rest.model}`);
    }

    // Add test drives spread across these new vehicles
    const testDrives = [
      { vIdx: 0, client: 'Diego Paredes', phone: '11-2233-4455', email: 'diego.p@email.com', daysFromNow: 3, seller: 1, status: 'scheduled', notes: 'Interesado en financiación a 48 cuotas' },
      { vIdx: 1, client: 'Agustín Torres', phone: '11-3344-5566', email: null, daysFromNow: 5, seller: 2, status: 'scheduled', notes: null },
      { vIdx: 2, client: 'Luciana Gómez', phone: '11-7788-9900', email: 'luciana.g@email.com', daysFromNow: 7, seller: 3, status: 'scheduled', notes: 'Primera visita, vine por Instagram' },
      { vIdx: 3, client: 'Marcos Ruiz', phone: '11-5566-7788', email: null, daysFromNow: 2, seller: 4, status: 'scheduled', notes: 'Quiere entregar su auto usado' },
      { vIdx: 4, client: 'Camila Sosa', phone: '11-2233-4455', email: 'camila.sosa@email.com', daysFromNow: 10, seller: 5, status: 'scheduled', notes: null },
      { vIdx: 5, client: 'Sebastián Díaz', phone: '11-9900-1122', email: null, daysFromNow: 4, seller: 6, status: 'scheduled', notes: 'Busca vehículo para su empresa' },
      { vIdx: 6, client: 'Florencia Medina', phone: '11-6677-8899', email: 'flo.m@email.com', daysFromNow: -8, seller: 1, status: 'completed', notes: 'Le encantó el vehículo, va a consultar financiación' },
      { vIdx: 7, client: 'Nicolás Vega', phone: '11-1122-3344', email: null, daysFromNow: -12, seller: 2, status: 'completed', notes: null },
      { vIdx: 0, client: 'Romina Castillo', phone: '11-4455-6677', email: 'romina.c@email.com', daysFromNow: -5, seller: 3, status: 'cancelled', notes: 'Canceló por motivos personales' },
      { vIdx: 1, client: 'Esteban Moreno', phone: '11-8899-0011', email: null, daysFromNow: -3, seller: 4, status: 'completed', notes: 'Muy satisfecho, posible cierre la semana que viene' },
      { vIdx: 2, client: 'Valeria Núñez', phone: '11-3344-5566', email: 'valeria.n@email.com', daysFromNow: 14, seller: 5, status: 'scheduled', notes: null },
      { vIdx: 3, client: 'Pablo Acosta', phone: '11-7788-1234', email: null, daysFromNow: 6, seller: 6, status: 'scheduled', notes: 'Consulta por garantía extendida' },
      { vIdx: 4, client: 'Natalia Ferreira', phone: '11-5678-9012', email: 'natalia.f@email.com', daysFromNow: -15, seller: 1, status: 'completed', notes: 'Muy interesada, esperando respuesta del banco' },
      { vIdx: 5, client: 'Hernán Castro', phone: '11-9012-3456', email: null, daysFromNow: 8, seller: 2, status: 'scheduled', notes: null },
      { vIdx: 6, client: 'Silvana Ríos', phone: '11-3456-7890', email: 'silvana.r@email.com', daysFromNow: -20, seller: 3, status: 'cancelled', notes: 'Compró en otra concesionaria' },
    ];

    for (const td of testDrives) {
      const vehicleId = insertedIds[td.vIdx];
      const d = new Date();
      d.setDate(d.getDate() + td.daysFromNow);
      d.setHours(9 + (td.vIdx % 9), 0, 0, 0);
      await client.query(
        `INSERT INTO test_drives (vehicle_id, client_name, client_phone, client_email, scheduled_at, notes, seller_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [vehicleId, td.client, td.phone, td.email, d.toISOString(), td.notes, td.seller, td.status]
      );
      console.log(`  📅 TD: ${td.client} → vehicle ${vehicleId} (${td.status})`);
    }

    console.log('\n🎉 Fix complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
