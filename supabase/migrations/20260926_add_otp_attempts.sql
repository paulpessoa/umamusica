-- Migration: 20260926_add_otp_attempts.sql

ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;
