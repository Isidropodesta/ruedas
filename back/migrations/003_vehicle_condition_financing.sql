-- Migration 003: Add condition and financing_available to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS condition VARCHAR(10) DEFAULT 'used' CHECK (condition IN ('new', 'used'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS financing_available BOOLEAN DEFAULT false;
