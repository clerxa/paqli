-- Enrichir packages
alter table public.packages
  add column if not exists job_summary       text,
  add column if not exists missions          jsonb default '[]'::jsonb,
  add column if not exists stack             text[],
  add column if not exists job_type          text default 'full_time',
  add column if not exists contract_type     text default 'cdi',
  add column if not exists remote_policy     text default 'hybrid',
  add column if not exists remote_days       integer,
  add column if not exists remote_guaranteed boolean default false,
  add column if not exists flexible_hours    boolean default false,
  add column if not exists location_city     text,
  add column if not exists location_details  text,
  add column if not exists team_size         integer,
  add column if not exists team_description  text,
  add column if not exists manager_style     text,
  add column if not exists company_values    text[],
  add column if not exists culture_note      text,
  add column if not exists glassdoor_url     text,
  add column if not exists wtj_url           text,
  add column if not exists growth_paths      jsonb default '[]'::jsonb,
  add column if not exists training_budget   integer,
  add column if not exists onboarding_note   text,
  add column if not exists process_steps     jsonb default '[]'::jsonb,
  add column if not exists process_duration  text,
  add column if not exists start_date        text;

-- Salary benchmarks
create table if not exists public.salary_benchmarks (
  id          uuid primary key default gen_random_uuid(),
  job_family  text not null,
  seniority   text not null,
  location    text not null default 'paris',
  p25         numeric not null,
  p50         numeric not null,
  p75         numeric not null,
  source      text default 'levels.fyi',
  version     text not null default '2026-H1',
  updated_at  date not null,
  unique (job_family, seniority, location, version)
);

alter table public.salary_benchmarks enable row level security;

drop policy if exists "Public read salary benchmarks" on public.salary_benchmarks;
create policy "Public read salary benchmarks"
  on public.salary_benchmarks for select
  to anon, authenticated
  using (true);

insert into public.salary_benchmarks
  (job_family, seniority, location, p25, p50, p75, updated_at) values
  ('software_engineer', 'junior', 'paris', 38000, 44000, 52000,  '2026-01-01'),
  ('software_engineer', 'mid',    'paris', 50000, 58000, 68000,  '2026-01-01'),
  ('software_engineer', 'senior', 'paris', 62000, 72000, 85000,  '2026-01-01'),
  ('software_engineer', 'lead',   'paris', 75000, 88000, 105000, '2026-01-01'),
  ('product_manager',   'junior', 'paris', 40000, 46000, 54000,  '2026-01-01'),
  ('product_manager',   'mid',    'paris', 52000, 60000, 72000,  '2026-01-01'),
  ('product_manager',   'senior', 'paris', 65000, 76000, 92000,  '2026-01-01'),
  ('data_scientist',    'mid',    'paris', 48000, 56000, 68000,  '2026-01-01'),
  ('data_scientist',    'senior', 'paris', 62000, 74000, 90000,  '2026-01-01'),
  ('designer',          'mid',    'paris', 42000, 50000, 60000,  '2026-01-01'),
  ('designer',          'senior', 'paris', 55000, 65000, 78000,  '2026-01-01'),
  ('devops_engineer',   'mid',    'paris', 50000, 58000, 70000,  '2026-01-01'),
  ('devops_engineer',   'senior', 'paris', 62000, 74000, 88000,  '2026-01-01'),
  ('data_engineer',     'mid',    'paris', 48000, 57000, 68000,  '2026-01-01'),
  ('data_engineer',     'senior', 'paris', 60000, 72000, 86000,  '2026-01-01')
on conflict (job_family, seniority, location, version) do nothing;