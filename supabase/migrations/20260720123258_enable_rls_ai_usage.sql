-- Migration: Enable Row Level Security (RLS) for AI Usage and Rate Limit tables
alter table public.ai_usage_daily enable row level security;
alter table public.rate_limit_events enable row level security;
