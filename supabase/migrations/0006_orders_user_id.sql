-- Phase 1: Add user_id to orders (nullable, with FK to auth.users)
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists orders_user_id_idx on public.orders (user_id);
