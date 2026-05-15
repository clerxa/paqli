create table public.package_benefits (
  id              uuid primary key default gen_random_uuid(),
  package_id      uuid not null references public.packages(id) on delete cascade,
  benefit_key     text not null,
  category        text not null,
  value_type      text not null default 'fixed',
  monthly_value   numeric,
  annual_value    numeric,
  employer_share  numeric,
  custom_label    text,
  custom_note     text,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.package_benefits enable row level security;

create policy "RH select benefits"
  on public.package_benefits for select to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH insert benefits"
  on public.package_benefits for insert to authenticated
  with check (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH update benefits"
  on public.package_benefits for update to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "RH delete benefits"
  on public.package_benefits for delete to authenticated
  using (package_id in (select id from public.packages where organization_id = public.current_user_org()));

create policy "Public read benefits via link"
  on public.package_benefits for select to anon
  using (package_id in (select package_id from public.candidate_links));

create index idx_package_benefits_package on public.package_benefits(package_id, display_order);