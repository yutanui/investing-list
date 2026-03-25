-- Auto-update updated_at on every holdings row UPDATE
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger holdings_set_updated_at
before update on holdings
for each row execute function set_updated_at();
