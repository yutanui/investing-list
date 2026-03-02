-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Run AFTER 003_add_currency.sql

-- 1. Add holding_type column with default 'core' for existing rows
alter table holdings add column holding_type text not null default 'core';

-- 2. Add check constraint to ensure valid holding_type values
alter table holdings add constraint valid_holding_type
  check (holding_type in ('core', 'satellite'));

-- 3. Create index for efficient filtering by holding_type
create index holdings_holding_type_idx on holdings (holding_type);
