ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS component_report JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS test_drives (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  client_name VARCHAR(100) NOT NULL,
  client_phone VARCHAR(30),
  client_email VARCHAR(100),
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  seller_id INTEGER REFERENCES sellers(id),
  created_at TIMESTAMP DEFAULT NOW()
);
