-- Migration: rate limit de custo de IA por usuário/dia
-- Reset diário à meia-noite de Brasília (America/Sao_Paulo).

-- ─── Tabela de acumulado diário por usuário ───────────────────
create table if not exists public.ai_usage_daily (
  email      text          not null,
  usage_date date          not null default (now() at time zone 'America/Sao_Paulo')::date,
  cost_brl   numeric(12,6) not null default 0,
  requests   integer       not null default 0,
  updated_at timestamptz   not null default now(),
  primary key (email, usage_date)
);

create index if not exists idx_ai_usage_daily_date on public.ai_usage_daily (usage_date);

-- ─── Tabela de eventos de bloqueio (auditoria) ────────────────
create table if not exists public.rate_limit_events (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null,
  usage_date   date        not null default (now() at time zone 'America/Sao_Paulo')::date,
  endpoint     text,
  cost_brl     numeric(12,6),
  limit_brl    numeric(12,6),
  admin_notified boolean   not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_rate_limit_events_email_date
  on public.rate_limit_events (email, usage_date);

-- ─── RPC: incremento atômico do custo diário ──────────────────
create or replace function public.increment_ai_usage(p_email text, p_cost numeric)
returns numeric
language plpgsql
security definer
as $$
declare
  v_total numeric;
  v_date  date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.ai_usage_daily (email, usage_date, cost_brl, requests, updated_at)
  values (lower(trim(p_email)), v_date, coalesce(p_cost, 0), 1, now())
  on conflict (email, usage_date)
  do update set cost_brl   = public.ai_usage_daily.cost_brl + coalesce(excluded.cost_brl, 0),
                requests   = public.ai_usage_daily.requests + 1,
                updated_at = now()
  returning cost_brl into v_total;
  return v_total;
end;
$$;

-- ─── RPC: registra 1 evento de bloqueio somente 1x/dia por email ──
-- Retorna true se este é o primeiro bloqueio do dia (deve notificar admin).
create or replace function public.record_rate_limit_event(
  p_email text,
  p_endpoint text,
  p_cost numeric,
  p_limit numeric
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_date  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_first boolean := false;
begin
  -- É o primeiro bloqueio do dia para este email?
  select not exists (
    select 1 from public.rate_limit_events
    where email = lower(trim(p_email)) and usage_date = v_date
  ) into v_first;

  insert into public.rate_limit_events (email, usage_date, endpoint, cost_brl, limit_brl, admin_notified)
  values (lower(trim(p_email)), v_date, p_endpoint, p_cost, p_limit, v_first);

  return v_first;
end;
$$;
