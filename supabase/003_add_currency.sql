-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Run AFTER 002_add_portfolios.sql

-- 1. Add currency columns to holdings table with default THB
alter table holdings add column avg_cost_currency text not null default 'THB';
alter table holdings add column current_price_currency text not null default 'THB';

-- 2. Add check constraint to ensure valid currency values
alter table holdings add constraint valid_avg_cost_currency
  check (avg_cost_currency in ('THB', 'USD'));
alter table holdings add constraint valid_current_price_currency
  check (current_price_currency in ('THB', 'USD'));

-- 3. Create indexes for efficient filtering by currency
create index holdings_avg_cost_currency_idx on holdings (avg_cost_currency);
create index holdings_current_price_currency_idx on holdings (current_price_currency);
