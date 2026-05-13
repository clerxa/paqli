
create table public.equity_devices (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  type text not null,
  quantity integer not null default 0,
  strike_price numeric not null default 0,
  current_valuation_m numeric not null default 0,
  vesting_years integer not null default 4,
  cliff_months integer not null default 6,
  special_conditions text,
  created_at timestamptz not null default now()
);

alter table public.equity_devices enable row level security;

create policy "RH select equity" on public.equity_devices
  for select to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH insert equity" on public.equity_devices
  for insert to authenticated
  with check (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH update equity" on public.equity_devices
  for update to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH delete equity" on public.equity_devices
  for delete to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create index equity_devices_pkg_idx on public.equity_devices(package_id);

create table public.savings_devices (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  type text not null,
  matching_rate numeric default 0,
  cap_amount numeric default 0,
  avg_3y numeric,
  created_at timestamptz not null default now()
);

alter table public.savings_devices enable row level security;

create policy "RH select savings" on public.savings_devices
  for select to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH insert savings" on public.savings_devices
  for insert to authenticated
  with check (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH update savings" on public.savings_devices
  for update to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));
create policy "RH delete savings" on public.savings_devices
  for delete to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create index savings_devices_pkg_idx on public.savings_devices(package_id);
