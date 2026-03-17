require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(/\s+/g, ''),
  ssl: { rejectUnauthorized: false },
});

// Sellers already exist: 1=Carlos, 2=Martina, 3=Diego, 4=Valentina, 5=Lucas, 6=Sofía
const SELLERS = [1, 2, 3, 4, 5, 6];

const componentReport = (quality) => {
  const c = (q) => {
    if (q === 'good') return ['bueno', 'bueno', 'bueno', 'regular', 'bueno', 'bueno'][Math.floor(Math.random() * 6)] === 'bueno' ? 'bueno' : 'regular';
    if (q === 'regular') return Math.random() > 0.5 ? 'regular' : 'malo';
    return 'malo';
  };
  return {
    motor: quality === 'good' ? 'bueno' : 'regular',
    transmision: quality === 'good' ? 'bueno' : c(quality),
    frenos: c(quality),
    suspension: c(quality),
    direccion: quality === 'good' ? 'bueno' : c(quality),
    neumaticos: c(quality),
    bateria: quality === 'good' ? 'bueno' : c(quality),
    luces: quality === 'good' ? 'bueno' : 'regular',
    ac: quality === 'good' ? 'bueno' : c(quality),
    carroceria: quality === 'good' ? 'bueno' : c(quality),
    interior: quality === 'good' ? 'bueno' : 'regular',
    sistema_electrico: c(quality),
    escape: quality === 'good' ? 'bueno' : c(quality),
    radiador: quality === 'good' ? 'bueno' : c(quality),
    amortiguadores: c(quality),
    embrague: quality === 'good' ? 'bueno' : c(quality),
    diferencial: quality === 'good' ? 'bueno' : c(quality),
  };
};

// New vehicles to insert
const newVehicles = [
  // Road
  { brand: 'Honda', model: 'Fit', year: 2021, km: 28000, price_min: 14000, price_max: 16500, color: 'Azul', type: 'road', description: 'Motor 1.5, excelente consumo.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, camara_reversa: false, consumo_l100km: 6.8, autonomia_km: 580 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/2016_Honda_Jazz_1.5_i-VTEC_Sport_CVT_%28facelift%2C_blue%29%2C_front_8.21.19.jpg/320px-2016_Honda_Jazz_1.5_i-VTEC_Sport_CVT_%28facelift%2C_blue%29%2C_front_8.21.19.jpg' },
  { brand: 'Volkswagen', model: 'Polo', year: 2023, km: 12000, price_min: 19000, price_max: 22000, color: 'Gris', type: 'road', description: 'Última generación, garantía de fábrica.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, consumo_l100km: 6.2, autonomia_km: 620 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2017_Volkswagen_Polo_SE_TSI_1.0_Front.jpg/320px-2017_Volkswagen_Polo_SE_TSI_1.0_Front.jpg' },
  { brand: 'Renault', model: 'Sandero', year: 2022, km: 35000, price_min: 11000, price_max: 13500, color: 'Rojo', type: 'road', description: 'Ideal para ciudad, bajo consumo.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, camara_reversa: false, consumo_l100km: 7.1, autonomia_km: 540 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/2013_Renault_Sandero_Expression_1.6_16V_Hi-Flex_%282013-10-11%29.jpg/320px-2013_Renault_Sandero_Expression_1.6_16V_Hi-Flex_%282013-10-11%29.jpg' },
  { brand: 'Fiat', model: 'Cronos', year: 2023, km: 9000, price_min: 16000, price_max: 18500, color: 'Blanco', type: 'road', description: 'Sedán moderno con buena capacidad de baúl.', features: { puertas: 4, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, consumo_l100km: 6.5, autonomia_km: 600 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Fiat_Cronos_Drive_1.3_GSE_2018_%2846375748985%29.jpg/320px-Fiat_Cronos_Drive_1.3_GSE_2018_%2846375748985%29.jpg' },
  { brand: 'Toyota', model: 'Etios', year: 2020, km: 52000, price_min: 10000, price_max: 12000, color: 'Gris', type: 'road', description: 'Confiable y económico, ideal para taxi.', features: { puertas: 4, bluetooth: false, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, camara_reversa: false, consumo_l100km: 8.0, autonomia_km: 500 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Toyota_Etios_sedan_%28facelift%2C_India%29_front.jpg/320px-Toyota_Etios_sedan_%28facelift%2C_India%29_front.jpg' },
  { brand: 'Chevrolet', model: 'Onix', year: 2022, km: 22000, price_min: 15000, price_max: 17500, color: 'Negro', type: 'road', description: 'El más vendido de Argentina, excelente estado.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, consumo_l100km: 6.9, autonomia_km: 570 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/2020_Chevrolet_Onix_Plus_1.0_Turbo_Premier_II_%28Brazil%29%2C_front_8.31.20.jpg/320px-2020_Chevrolet_Onix_Plus_1.0_Turbo_Premier_II_%28Brazil%29%2C_front_8.31.20.jpg' },
  { brand: 'Peugeot', model: '208', year: 2023, km: 7000, price_min: 20000, price_max: 23000, color: 'Azul', type: 'road', description: 'Diseño premium, interior digital.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_reversa: true, consumo_l100km: 6.0, autonomia_km: 650 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/2019_Peugeot_208_Active_1.2_PureTech_75_Front.jpg/320px-2019_Peugeot_208_Active_1.2_PureTech_75_Front.jpg' },

  // Utility
  { brand: 'Ford', model: 'Transit', year: 2021, km: 68000, price_min: 28000, price_max: 32000, color: 'Blanco', type: 'utility', description: 'Carga y pasajeros, impecable.', features: { puertas: 4, bluetooth: true, combustible: 'diesel', transmision: 'manual', aire_acondicionado: true, carga_kg: 1400, volumen_m3: 11.5 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/2016_Ford_Transit_350_High_Roof_%2821097571918%29.jpg/320px-2016_Ford_Transit_350_High_Roof_%2821097571918%29.jpg' },
  { brand: 'Fiat', model: 'Fiorino', year: 2022, km: 41000, price_min: 13000, price_max: 15000, color: 'Gris', type: 'utility', description: 'Ideal para reparto, muy maniobrable.', features: { puertas: 2, bluetooth: false, combustible: 'nafta', transmision: 'manual', aire_acondicionado: false, carga_kg: 550, volumen_m3: 2.5 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Fiat_Fiorino_Van_%28Mk_III%2C_facelift%29_--_02-03-2012.jpg/320px-Fiat_Fiorino_Van_%28Mk_III%2C_facelift%29_--_02-03-2012.jpg' },
  { brand: 'Renault', model: 'Master', year: 2020, km: 95000, price_min: 24000, price_max: 27000, color: 'Blanco', type: 'utility', description: 'Furgón grande, ideal para empresas.', features: { puertas: 3, bluetooth: false, combustible: 'diesel', transmision: 'manual', aire_acondicionado: true, carga_kg: 1600, volumen_m3: 13 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Renault_Master_%28T28%29_box_van.jpg/320px-Renault_Master_%28T28%29_box_van.jpg' },
  { brand: 'Volkswagen', model: 'Saveiro', year: 2021, km: 55000, price_min: 17000, price_max: 20000, color: 'Azul', type: 'utility', description: 'Pick-up compacta, versátil y económica.', features: { puertas: 2, bluetooth: true, combustible: 'nafta', transmision: 'manual', aire_acondicionado: true, carga_kg: 700, volumen_m3: 1.2 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/VW_Saveiro_Cross_CD_%28G6%2C_facelift%29_--_09-24-2017.jpg/320px-VW_Saveiro_Cross_CD_%28G6%2C_facelift%29_--_09-24-2017.jpg' },
  { brand: 'Nissan', model: 'Frontier', year: 2022, km: 38000, price_min: 35000, price_max: 40000, color: 'Negro', type: 'utility', description: '4x4 doble cabina, equipada full.', features: { puertas: 4, bluetooth: true, combustible: 'diesel', transmision: 'automatica', aire_acondicionado: true, carga_kg: 985, volumen_m3: 1.4 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/2022_Nissan_Frontier_Pro-4X_%28Mexico%29%2C_front_11.28.22.jpg/320px-2022_Nissan_Frontier_Pro-4X_%28Mexico%29%2C_front_11.28.22.jpg' },

  // Luxury
  { brand: 'BMW', model: 'X5', year: 2022, km: 25000, price_min: 75000, price_max: 85000, color: 'Negro', type: 'luxury', description: 'SUV premium, full equipo, impecable.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: true, km_autonomia: 450 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2019_BMW_X5_xDrive30d_M_Sport_Automatic_3.0_%28front%29.jpg/320px-2019_BMW_X5_xDrive30d_M_Sport_Automatic_3.0_%28front%29.jpg' },
  { brand: 'Mercedes-Benz', model: 'GLE', year: 2021, km: 32000, price_min: 80000, price_max: 92000, color: 'Gris', type: 'luxury', description: 'Lujo y confort insuperables.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: true, km_autonomia: 470 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/2020_Mercedes-Benz_GLE_450_AMG_Line_%284MATIC%29_facelift%2C_front_8.10.20.jpg/320px-2020_Mercedes-Benz_GLE_450_AMG_Line_%284MATIC%29_facelift%2C_front_8.10.20.jpg' },
  { brand: 'Audi', model: 'Q7', year: 2023, km: 8000, price_min: 90000, price_max: 105000, color: 'Blanco', type: 'luxury', description: '7 asientos, tecnología de punta.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: true, km_autonomia: 480 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Audi_Q7_3.0_TFSI_quattro_%28II%29_%E2%80%93_Frontansicht%2C_22._Juni_2016%2C_D%C3%BCsseldorf.jpg/320px-Audi_Q7_3.0_TFSI_quattro_%28II%29_%E2%80%93_Frontansicht%2C_22._Juni_2016%2C_D%C3%BCsseldorf.jpg' },
  { brand: 'Porsche', model: 'Cayenne', year: 2022, km: 18000, price_min: 95000, price_max: 115000, color: 'Rojo', type: 'luxury', description: 'Deportivo y lujoso, garantía extendida.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: true, km_autonomia: 430 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/2019_Porsche_Cayenne_S_Coup%C3%A9_%28E3%29_2.9T_Front.jpg/320px-2019_Porsche_Cayenne_S_Coup%C3%A9_%28E3%29_2.9T_Front.jpg' },
  { brand: 'Lexus', model: 'RX 350', year: 2021, km: 42000, price_min: 65000, price_max: 75000, color: 'Gris', type: 'luxury', description: 'Híbrido japonés, confiabilidad extrema.', features: { puertas: 5, bluetooth: true, combustible: 'hibrido', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: false, km_autonomia: 700 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/2016_Lexus_RX_350_%28GGL25R%29_Luxury_wagon_%282018-11-02%29_01.jpg/320px-2016_Lexus_RX_350_%28GGL25R%29_Luxury_wagon_%282018-11-02%29_01.jpg' },
  { brand: 'Volvo', model: 'XC90', year: 2022, km: 29000, price_min: 78000, price_max: 90000, color: 'Azul', type: 'luxury', description: 'Máxima seguridad y diseño escandinavo.', features: { puertas: 5, bluetooth: true, combustible: 'nafta', transmision: 'automatica', aire_acondicionado: true, camara_360: true, asientos_cuero: true, techo_panoramico: true, km_autonomia: 460 }, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Volvo_XC90_T8_twin_engine_%28facelift%2C_grey%29%2C_front_8.17.19.jpg/320px-Volvo_XC90_T8_twin_engine_%28facelift%2C_grey%29%2C_front_8.17.19.jpg' },
];

// Dates spread across last 14 months
function randomDate(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.floor(Math.random() * 25) + 1);
  return d.toISOString();
}

// Which vehicles will be sold, and when
// We want a nice distribution: 3-6 sales per month for ~12 months
const soldData = [
  // existing vehicles already sold: 3=Mercedes (seller 2), 6=Honda Civic (seller 4), 10=Hilux (seller 6)
  // new vehicles: we'll mark some as sold
  // IDs will be 12–29 for the 18 new vehicles
  { relIdx: 0,  seller: 1, price: 16200, monthsAgo: 14 },  // Honda Fit
  { relIdx: 1,  seller: 3, price: 21500, monthsAgo: 13 },  // VW Polo
  { relIdx: 2,  seller: 2, price: 12800, monthsAgo: 13 },  // Sandero
  { relIdx: 3,  seller: 5, price: 17900, monthsAgo: 12 },  // Fiat Cronos
  { relIdx: 4,  seller: 4, price: 11200, monthsAgo: 12 },  // Toyota Etios
  { relIdx: 5,  seller: 1, price: 17000, monthsAgo: 11 },  // Chevrolet Onix
  { relIdx: 6,  seller: 6, price: 22800, monthsAgo: 11 },  // Peugeot 208
  { relIdx: 7,  seller: 3, price: 30500, monthsAgo: 10 },  // Ford Transit
  { relIdx: 8,  seller: 2, price: 14100, monthsAgo: 10 },  // Fiat Fiorino
  { relIdx: 9,  seller: 5, price: 25900, monthsAgo: 9  },  // Renault Master
  { relIdx: 10, seller: 1, price: 18700, monthsAgo: 9  },  // VW Saveiro
  { relIdx: 11, seller: 4, price: 38200, monthsAgo: 8  },  // Nissan Frontier
  { relIdx: 12, seller: 6, price: 82000, monthsAgo: 8  },  // BMW X5
  { relIdx: 13, seller: 3, price: 88500, monthsAgo: 7  },  // Mercedes GLE
  { relIdx: 14, seller: 2, price: 98000, monthsAgo: 7  },  // Audi Q7
  { relIdx: 15, seller: 5, price: 108000, monthsAgo: 6  }, // Porsche Cayenne
  { relIdx: 16, seller: 1, price: 69000, monthsAgo: 6  },  // Lexus RX350
  { relIdx: 17, seller: 4, price: 84000, monthsAgo: 5  },  // Volvo XC90
];

// Additional vehicles for more month coverage (will be sold with overridden dates)
// We'll also create test drives for ~15 vehicles
const testDrivesData = [
  { clientName: 'Agustín Torres', phone: '11-3344-5566', email: 'agustin@email.com', monthsAgo: 0, daysOffset: 2, notes: 'Interesado en financiación' },
  { clientName: 'Luciana Gómez', phone: '11-7788-9900', email: 'luciana@email.com', monthsAgo: 0, daysOffset: 5, notes: 'Quiere comparar con otro modelo' },
  { clientName: 'Marcos Ruiz', phone: '11-5566-7788', email: null, monthsAgo: 0, daysOffset: 1, notes: null },
  { clientName: 'Camila Sosa', phone: '11-2233-4455', email: 'camila@email.com', monthsAgo: 0, daysOffset: 7, notes: 'Primera visita al local' },
  { clientName: 'Sebastián Díaz', phone: '11-9900-1122', email: null, monthsAgo: 0, daysOffset: 3, notes: 'Ya tiene un auto para entregar' },
  { clientName: 'Florencia Medina', phone: '11-6677-8899', email: 'flo.medina@email.com', monthsAgo: 0, daysOffset: 10, notes: 'Busca vehículo familiar' },
  { clientName: 'Nicolás Vega', phone: '11-1122-3344', email: null, monthsAgo: 1, daysOffset: 0, notes: null },
  { clientName: 'Romina Castillo', phone: '11-4455-6677', email: 'romina@email.com', monthsAgo: 1, daysOffset: 8, notes: 'Viene con su marido' },
  { clientName: 'Esteban Moreno', phone: '11-8899-0011', email: null, monthsAgo: 1, daysOffset: 15, notes: 'Interesado en descuento' },
  { clientName: 'Valeria Núñez', phone: '11-3344-5566', email: 'valeria.n@email.com', monthsAgo: 0, daysOffset: 4, notes: null },
  { clientName: 'Pablo Acosta', phone: '11-7788-1234', email: null, monthsAgo: 0, daysOffset: 6, notes: 'Consulta por garantía' },
  { clientName: 'Natalia Ferreira', phone: '11-5678-9012', email: 'natalia.f@email.com', monthsAgo: 0, daysOffset: 9, notes: 'Está decidida a comprar' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting seed...\n');

    // 1. Insert new vehicles
    const insertedIds = [];
    for (const v of newVehicles) {
      const { photo, features, ...rest } = v;
      const result = await client.query(
        `INSERT INTO vehicles (brand, model, year, km, price_min, price_max, color, type, description, features, status, component_report)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'available',$11) RETURNING id`,
        [rest.brand, rest.model, rest.year, rest.km, rest.price_min, rest.price_max, rest.color, rest.type, rest.description,
         JSON.stringify(features), JSON.stringify(componentReport('good'))]
      );
      const vId = result.rows[0].id;
      insertedIds.push(vId);
      // Insert photo
      await client.query('INSERT INTO vehicle_photos (vehicle_id, url) VALUES ($1,$2)', [vId, photo]);
      console.log(`  ✅ Vehicle ${vId}: ${rest.brand} ${rest.model}`);
    }

    // 2. Update existing vehicles with component reports
    const existingIds = [1,2,3,4,5,6,7,8,9,10,11];
    for (const id of existingIds) {
      await client.query('UPDATE vehicles SET component_report=$1 WHERE id=$2', [JSON.stringify(componentReport('good')), id]);
    }
    console.log('\n  ✅ Component reports added to existing vehicles');

    // 3. Mark new vehicles as sold with historical dates
    for (const sd of soldData) {
      const vehicleId = insertedIds[sd.relIdx];
      const soldAt = randomDate(sd.monthsAgo);
      await client.query(
        `UPDATE vehicles SET status='sold', seller_id=$1, sale_price=$2, sold_at=$3 WHERE id=$4`,
        [sd.seller, sd.price, soldAt, vehicleId]
      );
      console.log(`  💰 Vehicle ${vehicleId} sold for $${sd.price} (${sd.monthsAgo} months ago) by seller ${sd.seller}`);
    }

    // 4. Also update existing sold vehicles with spread dates
    await client.query(`UPDATE vehicles SET sold_at=$1 WHERE id=3`, [randomDate(3)]);
    await client.query(`UPDATE vehicles SET sold_at=$1 WHERE id=6`, [randomDate(2)]);
    await client.query(`UPDATE vehicles SET sold_at=$1 WHERE id=10`, [randomDate(1)]);
    console.log('\n  ✅ Updated sold_at for existing sold vehicles');

    // 5. Mark a few more available vehicles as sold in recent months
    // vehicles: 1=Corolla, 2=Ranger, 4=Amarok, 5=BMW Serie3, 7=S10, 8=AudiA4
    const recentSales = [
      { id: 2, seller: 6, price: 34000, monthsAgo: 4 },
      { id: 4, seller: 3, price: 42000, monthsAgo: 3 },
      { id: 5, seller: 2, price: 58000, monthsAgo: 2 },
      { id: 7, seller: 1, price: 36000, monthsAgo: 2 },
      { id: 1, seller: 5, price: 19500, monthsAgo: 1 },
      { id: 8, seller: 4, price: 62000, monthsAgo: 0 },
    ];
    for (const rs of recentSales) {
      await client.query(
        `UPDATE vehicles SET status='sold', seller_id=$1, sale_price=$2, sold_at=$3 WHERE id=$4`,
        [rs.seller, rs.price, randomDate(rs.monthsAgo), rs.id]
      );
      console.log(`  💰 Vehicle ${rs.id} sold for $${rs.price} (${rs.monthsAgo} months ago)`);
    }

    // 6. Create test drives (using available vehicles)
    // Get currently available vehicle IDs
    const availResult = await client.query(`SELECT id FROM vehicles WHERE status='available' ORDER BY id`);
    const availIds = availResult.rows.map(r => r.id);
    console.log('\n  Available vehicles for test drives:', availIds);

    const sellerCycle = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < testDrivesData.length; i++) {
      const td = testDrivesData[i];
      const vehicleId = availIds[i % availIds.length];
      const sellerId = sellerCycle[i % sellerCycle.length];
      const d = new Date();
      d.setMonth(d.getMonth() - td.monthsAgo);
      d.setDate(d.getDate() + td.daysOffset);
      d.setHours(9 + (i % 8), 0, 0, 0);
      const status = td.monthsAgo > 0 ? (Math.random() > 0.4 ? 'completed' : 'cancelled') : 'scheduled';
      await client.query(
        `INSERT INTO test_drives (vehicle_id, client_name, client_phone, client_email, scheduled_at, notes, seller_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [vehicleId, td.clientName, td.phone, td.email, d.toISOString(), td.notes, sellerId, status]
      );
      console.log(`  📅 Test drive: ${td.clientName} → vehicle ${vehicleId} (${status})`);
    }

    // 7. Update seller photo_url
    const sellerPhotos = [
      { id: 1, url: 'https://randomuser.me/api/portraits/men/32.jpg' },
      { id: 2, url: 'https://randomuser.me/api/portraits/women/44.jpg' },
      { id: 3, url: 'https://randomuser.me/api/portraits/men/67.jpg' },
      { id: 4, url: 'https://randomuser.me/api/portraits/women/28.jpg' },
      { id: 5, url: 'https://randomuser.me/api/portraits/men/55.jpg' },
      { id: 6, url: 'https://randomuser.me/api/portraits/women/19.jpg' },
    ];
    for (const sp of sellerPhotos) {
      await client.query('UPDATE sellers SET photo_url=$1 WHERE id=$2', [sp.url, sp.id]);
    }
    console.log('\n  ✅ Seller photos updated');

    console.log('\n🎉 Seed complete!');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
