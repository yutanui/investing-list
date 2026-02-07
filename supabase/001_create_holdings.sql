-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create the holdings table
create table holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name          text not null,
  ticker        text,
  asset_type    text not null check (asset_type in ('stock', 'etf', 'mutual_fund', 'bond')),
  shares        numeric not null check (shares >= 0),
  avg_cost      numeric not null check (avg_cost >= 0),
  current_price numeric not null check (current_price >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table holdings enable row level security;

-- 3. RLS policy: users can only access their own holdings
create policy "Users manage own holdings"
  on holdings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Index for fast lookup by user
create index holdings_user_id_idx on holdings (user_id);
