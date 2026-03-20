-- Migration 004: Multi-company support
-- Strategy:
--   1. Create companies table
--   2. Insert default company for existing data
--   3. Add company_id to each table using a DO block:
--      - Add column (nullable first)
--      - Backfill all existing rows with the default company
--      - Set NOT NULL
--      - Set DEFAULT to the default company id
--   4. test_drives existence is verified before touching it

-- ── Step 1: Companies table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50)  UNIQUE NOT NULL,
  logo_url    TEXT,
  active      BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- ── Step 2: Default company (idempotent via ON CONFLICT) ─────
INSERT INTO companies (name, slug, active)
VALUES ('Ruedas Concesionaria', 'ruedas', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Step 3: Add company_id to all tables ────────────────────
DO $$
DECLARE
  cid INTEGER;
BEGIN
  SELECT id INTO cid FROM companies WHERE slug = 'ruedas';

  -- ── sellers ────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sellers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE sellers ADD COLUMN company_id INTEGER REFERENCES companies(id);
    EXECUTE format('UPDATE sellers SET company_id = %s', cid);
    ALTER TABLE sellers ALTER COLUMN company_id SET NOT NULL;
    EXECUTE format('ALTER TABLE sellers ALTER COLUMN company_id SET DEFAULT %s', cid);
  END IF;

  -- ── vehicles ───────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN company_id INTEGER REFERENCES companies(id);
    EXECUTE format('UPDATE vehicles SET company_id = %s', cid);
    ALTER TABLE vehicles ALTER COLUMN company_id SET NOT NULL;
    EXECUTE format('ALTER TABLE vehicles ALTER COLUMN company_id SET DEFAULT %s', cid);
  END IF;

  -- ── users ──────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id);
    EXECUTE format('UPDATE users SET company_id = %s', cid);
    ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
    EXECUTE format('ALTER TABLE users ALTER COLUMN company_id SET DEFAULT %s', cid);
  END IF;

  -- ── test_drives (verified: table exists) ───────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'test_drives'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'test_drives' AND column_name = 'company_id'
    ) THEN
      ALTER TABLE test_drives ADD COLUMN company_id INTEGER REFERENCES companies(id);
      EXECUTE format('UPDATE test_drives SET company_id = %s', cid);
      ALTER TABLE test_drives ALTER COLUMN company_id SET NOT NULL;
      EXECUTE format('ALTER TABLE test_drives ALTER COLUMN company_id SET DEFAULT %s', cid);
    END IF;
  END IF;

END $$;
