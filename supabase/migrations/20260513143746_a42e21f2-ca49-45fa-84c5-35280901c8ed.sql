create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  label text not null,
  target_valuation_m numeric not null default 0,
  horizon_years integer not null default 4,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

create policy "RH select scenarios"
  on public.scenarios for select to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH insert scenarios"
  on public.scenarios for insert to authenticated
  with check (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH update scenarios"
  on public.scenarios for update to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH delete scenarios"
  on public.scenarios for delete to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

alter table public.packages add column if not exists scenario_display text not null default 'all';
