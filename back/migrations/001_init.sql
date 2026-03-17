CREATE TYPE vehicle_type AS ENUM ('utility', 'road', 'luxury');
CREATE TYPE vehicle_status AS ENUM ('available', 'sold', 'withdrawn');

CREATE TABLE IF NOT EXISTS sellers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  hire_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL DEFAULT 0,
  price_min DECIMAL(12,2),
  price_max DECIMAL(12,2),
  color VARCHAR(50),
  description TEXT,
  type vehicle_type NOT NULL,
  status vehicle_status DEFAULT 'available',
  features JSONB DEFAULT '{}',
  seller_id INTEGER REFERENCES sellers(id),
  sale_price DECIMAL(12,2),
  sold_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  withdrawal_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
