-- Migration: 20260926_add_order_processing_cols.sql

ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;
