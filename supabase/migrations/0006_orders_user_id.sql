alter table public.orders add column if not exists user_id uuid references public.users(id) on delete cascade;
create index if not exists orders_user_id_idx on public.orders (user_id);
