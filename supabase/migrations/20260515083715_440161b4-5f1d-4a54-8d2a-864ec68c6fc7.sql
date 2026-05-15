alter table public.candidate_links
  add column if not exists decision_deadline timestamptz,
  add column if not exists deadline_notified_48h boolean not null default false,
  add column if not exists deadline_notified_24h boolean not null default false,
  add column if not exists deadline_notified_expired boolean not null default false;

create index if not exists idx_candidate_links_decision_deadline
  on public.candidate_links (decision_deadline)
  where decision_deadline is not null;