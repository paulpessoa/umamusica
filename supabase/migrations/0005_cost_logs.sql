-- Cost monitoring: logs every AI interaction + Lyria music generation
-- so we can compute exact cost-per-song against the R$ 1,00 revenue.
-- Apply in the Supabase SQL editor (or via Supabase CLI migrations).

create table if not exists public.cost_logs (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  email text,
  stage text not null check (stage in ('chat', 'compose_lyrics', 'music_generation', 'revise')),
  provider text,
  input_tokens integer,
  output_tokens integer,
  api_cost numeric default 0,
  model text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists cost_logs_created_at_idx on public.cost_logs (created_at desc);
create index if not exists cost_logs_order_id_idx on public.cost_logs (order_id);
create index if not exists cost_logs_stage_idx on public.cost_logs (stage);

-- Row Level Security: service role only (server uses SUPABASE_SERVICE_ROLE_KEY).
alter table public.cost_logs enable row level security;
