-- candidate_links: colonnes relances + contre-offre
alter table public.candidate_links
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists last_reminder_at timestamptz,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists counter_offer_id uuid;

-- counter_offers
create table if not exists public.counter_offers (
  id uuid primary key default gen_random_uuid(),
  original_link_id uuid not null references public.candidate_links(id) on delete cascade,
  new_link_id uuid references public.candidate_links(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null,
  changes jsonb not null default '{}'::jsonb,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.counter_offers enable row level security;

drop policy if exists "RH can manage own org counter offers" on public.counter_offers;
create policy "RH can manage own org counter offers"
  on public.counter_offers for all
  to authenticated
  using (organization_id = public.current_user_org())
  with check (organization_id = public.current_user_org());

create index if not exists idx_counter_offers_link on public.counter_offers(original_link_id);
create index if not exists idx_counter_offers_org on public.counter_offers(organization_id);

drop trigger if exists set_counter_offers_updated_at on public.counter_offers;
create trigger set_counter_offers_updated_at
  before update on public.counter_offers
  for each row execute function public.set_updated_at();

-- reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.candidate_links(id) on delete cascade,
  type text not null,
  sent_at timestamptz not null default now(),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

drop policy if exists "RH can read own org reminders" on public.reminders;
create policy "RH can read own org reminders"
  on public.reminders for select
  to authenticated
  using (
    link_id in (
      select id from public.candidate_links
      where organization_id = public.current_user_org()
    )
  );

create index if not exists idx_reminders_link on public.reminders(link_id);
create index if not exists idx_candidate_links_status_org on public.candidate_links(organization_id, status);