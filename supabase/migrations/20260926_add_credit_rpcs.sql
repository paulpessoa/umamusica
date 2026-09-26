-- Migration: 20260926_add_credit_rpcs.sql

-- RPC para decrementar atômico o saldo de músicas grátis
CREATE OR REPLACE FUNCTION consume_free_song(p_user_id UUID)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE users
  SET free_songs_balance = free_songs_balance - 1
  WHERE id = p_user_id AND free_songs_balance > 0
  RETURNING free_songs_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- RPC para devolver saldo de músicas grátis (ex: falha na geração)
CREATE OR REPLACE FUNCTION increment_free_songs(p_user_id UUID)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE users
  SET free_songs_balance = free_songs_balance + 1
  WHERE id = p_user_id
  RETURNING free_songs_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- RPC para devolver uso de cupom (ex: falha na geração de pedido com cupom)
CREATE OR REPLACE FUNCTION decrement_coupon_uses(p_code text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_uses integer;
BEGIN
  UPDATE coupons
  SET current_uses = current_uses - 1
  WHERE code = p_code AND current_uses > 0
  RETURNING current_uses INTO new_uses;

  RETURN new_uses;
END;
$$;

-- RPC para incrementar uso de cupom
CREATE OR REPLACE FUNCTION increment_coupon_uses(p_code text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_uses integer;
BEGIN
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE code = p_code
  RETURNING current_uses INTO new_uses;

  RETURN new_uses;
END;
$$;
