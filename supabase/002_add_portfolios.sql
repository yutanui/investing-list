-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Run AFTER 001_create_holdings.sql

-- 1. Create the portfolios table
create table portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table portfolios enable row level security;

-- 3. RLS policy: users can only access their own portfolios
create policy "Users manage own portfolios"
  on portfolios
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Index for fast lookup by user
create index portfolios_user_id_idx on portfolios (user_id);

-- 5. Add portfolio_id column to holdings (nullable initially for migration)
alter table holdings add column portfolio_id uuid references portfolios(id) on delete cascade;

-- 6. Index for fast lookup by portfolio
create index holdings_portfolio_id_idx on holdings (portfolio_id);

-- 7. Migrate existing holdings: create default portfolio for each user
insert into portfolios (user_id, name)
select distinct user_id, 'My Portfolio'
from holdings
where portfolio_id is null;

-- 8. Assign orphaned holdings to user's default portfolio
update holdings h
set portfolio_id = (
  select p.id
  from portfolios p
  where p.user_id = h.user_id
  order by p.created_at
  limit 1
)
where h.portfolio_id is null;

-- 9. Make portfolio_id NOT NULL after migration
alter table holdings alter column portfolio_id set not null;
