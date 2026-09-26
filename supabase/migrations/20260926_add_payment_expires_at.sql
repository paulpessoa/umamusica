-- Migration: 20260926_add_payment_expires_at.sql

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;
