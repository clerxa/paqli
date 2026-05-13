
-- packages
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  status text not null default 'draft',
  gross_salary numeric,
  variable_target numeric,
  benefits jsonb default '{}'::jsonb,
  scenario_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.packages enable row level security;

create policy "RH can view own org packages" on public.packages
  for select to authenticated
  using (organization_id = public.current_user_org());

create policy "RH can insert own org packages" on public.packages
  for insert to authenticated
  with check (organization_id = public.current_user_org());

create policy "RH can update own org packages" on public.packages
  for update to authenticated
  using (organization_id = public.current_user_org());

create policy "RH can delete own org packages" on public.packages
  for delete to authenticated
  using (organization_id = public.current_user_org());

create trigger packages_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

create index packages_org_idx on public.packages(organization_id);

-- candidate_links
create table public.candidate_links (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(8), 'hex'),
  candidate_email text,
  candidate_name text,
  expires_at timestamptz,
  opened_at timestamptz,
  simulated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.candidate_links enable row level security;

create policy "RH can view own org links" on public.candidate_links
  for select to authenticated
  using (organization_id = public.current_user_org());

create policy "RH can insert own org links" on public.candidate_links
  for insert to authenticated
  with check (organization_id = public.current_user_org());

create policy "RH can update own org links" on public.candidate_links
  for update to authenticated
  using (organization_id = public.current_user_org());

create policy "RH can delete own org links" on public.candidate_links
  for delete to authenticated
  using (organization_id = public.current_user_org());

-- Public read by token (for candidate view)
create policy "Public can read by token" on public.candidate_links
  for select to anon
  using (true);

create index candidate_links_org_idx on public.candidate_links(organization_id);
create index candidate_links_pkg_idx on public.candidate_links(package_id);

-- link_events
create table public.link_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.candidate_links(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.link_events enable row level security;

create policy "RH can read own org events" on public.link_events
  for select to authenticated
  using (
    link_id in (
      select cl.id from public.candidate_links cl
      where cl.organization_id = public.current_user_org()
    )
  );

create policy "Anyone can insert events" on public.link_events
  for insert to anon, authenticated
  with check (true);

create index link_events_link_idx on public.link_events(link_id);
create index link_events_created_idx on public.link_events(created_at desc);

-- Realtime
alter publication supabase_realtime add table public.link_events;
alter table public.link_events replica identity full;
