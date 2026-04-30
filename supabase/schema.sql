create table if not exists public.finance_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_state_set_updated_at on public.finance_state;
create trigger finance_state_set_updated_at
before update on public.finance_state
for each row execute function public.set_updated_at();

alter table public.finance_state enable row level security;

drop policy if exists finance_state_select on public.finance_state;
create policy finance_state_select
on public.finance_state
for select
to anon, authenticated
using (true);

drop policy if exists finance_state_insert on public.finance_state;
create policy finance_state_insert
on public.finance_state
for insert
to anon, authenticated
with check (true);

drop policy if exists finance_state_update on public.finance_state;
create policy finance_state_update
on public.finance_state
for update
to anon, authenticated
using (true)
with check (true);

insert into public.finance_state (id, state)
values ('main', '{"movements":[],"receivables":[],"payables":[],"settings":{"incomeCategories":[],"expenseCategories":[]}}'::jsonb)
on conflict (id) do nothing;

alter publication supabase_realtime add table public.finance_state;
