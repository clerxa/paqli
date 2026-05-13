
-- ════════════════ TAX RULES ════════════════
create table public.tax_rules (
  id             uuid primary key default gen_random_uuid(),
  version        text not null,
  effective_date date not null,
  device_type    text not null,
  rule_key       text not null,
  value          numeric not null,
  description    text,
  source_url     text,
  created_at     timestamptz not null default now(),
  unique (version, device_type, rule_key)
);

alter table public.tax_rules enable row level security;

create policy "Public read tax rules"
  on public.tax_rules for select
  to anon, authenticated
  using (true);

create index idx_tax_rules_version on public.tax_rules(version);
create index idx_tax_rules_effective_date on public.tax_rules(effective_date desc);

-- ════════════════ SEED 2026-01 ════════════════
insert into public.tax_rules (version, effective_date, device_type, rule_key, value, description, source_url) values
('2026-01','2026-01-01','meta','flat_tax_total',      0.314, 'Flat tax PFU 2026 : 12,8% IR + 18,6% PS',          'Loi n°2025-1403 du 30/12/2025 art.12'),
('2026-01','2026-01-01','meta','ps_rate',             0.186, 'Prélèvements sociaux revenus du capital 2026',     'Loi n°2025-1403 du 30/12/2025 art.12'),
('2026-01','2026-01-01','meta','ir_pfu_rate',         0.128, 'Taux IR PFU (inchangé)',                            'Art. 200 A CGI'),
('2026-01','2026-01-01','meta','pass_2026',           47100, 'PASS 2026 provisoire',                              'Arrêté à venir nov. 2025'),

('2026-01','2026-01-01','bspce','ir_rate_3y_plus',    0.128, 'Taux IR gain exercice, ancienneté >= 3 ans',        'Art. 163 bis G CGI'),
('2026-01','2026-01-01','bspce','ir_rate_under_3y',   0.300, 'Taux IR gain exercice, ancienneté < 3 ans',         'Art. 163 bis G CGI'),
('2026-01','2026-01-01','bspce','ps_rate',            0.186, 'PS gain exercice BSPCE — LFSS 2026',                'Loi n°2025-1403 du 30/12/2025'),
('2026-01','2026-01-01','bspce','seniority_threshold',    3, 'Seuil ancienneté (années) taux réduit',             'Art. 163 bis G CGI'),

('2026-01','2026-01-01','aga','ir_rate',              0.128, 'Taux IR gain acquisition AGA — PFU',                'Art. 80 quaterdecies CGI'),
('2026-01','2026-01-01','aga','ps_rate',              0.186, 'PS gain acquisition AGA — LFSS 2026',               'Loi n°2025-1403 du 30/12/2025'),
('2026-01','2026-01-01','aga','employer_contrib',     0.300, 'Contribution patronale AGA 30% depuis 01/03/2025',  'Art. L137-13 CSS — LFSS 2025'),

('2026-01','2026-01-01','rsu','ir_rate',              0.128, 'Taux IR RSU — PFU',                                 'Art. 80 quaterdecies CGI'),
('2026-01','2026-01-01','rsu','ps_rate',              0.186, 'PS RSU — LFSS 2026',                                'Loi n°2025-1403 du 30/12/2025'),

('2026-01','2026-01-01','pee','matching_cap_amount',  3768,  'Plafond abondement PEE 2026 (8% PASS)',             'Art. R3332-8 Code travail'),
('2026-01','2026-01-01','pee','matching_max_mult',       3,  'Abondement max = triple de la mise salarié',        'Art. L3332-11 Code travail'),
('2026-01','2026-01-01','pee','csg_crds_entry',       0.097, 'CSG/CRDS sur abondement à l''entrée',               'Art. L136-1 CSS'),
('2026-01','2026-01-01','pee','ps_exit',              0.186, 'PS sur plus-values à la sortie — LFSS 2026',        'Loi n°2025-1403 du 30/12/2025'),
('2026-01','2026-01-01','pee','blocking_years',           5, 'Blocage légal PEE (années)',                        'Art. L3332-25 Code travail'),

('2026-01','2026-01-01','perco','matching_cap_amount',7536,  'Plafond abondement PERCO 2026 (16% PASS)',          'Art. D3334-3-2 Code travail'),
('2026-01','2026-01-01','perco','matching_max_mult',     3,  'Abondement max = triple de la mise salarié',        'Art. D3334-3-2 Code travail'),
('2026-01','2026-01-01','perco','csg_crds_entry',     0.097, 'CSG/CRDS sur abondement PERCO à l''entrée',         'Art. L136-1 CSS'),
('2026-01','2026-01-01','perco','ps_exit',            0.186, 'PS sur sortie en capital PERCO — LFSS 2026',        'Loi n°2025-1403 du 30/12/2025'),

('2026-01','2026-01-01','interessement','cap',        35325, 'Plafond individuel 2026 (75% PASS)',                'Art. L3315-2 Code travail'),
('2026-01','2026-01-01','interessement','csg_crds',   0.097, 'CSG/CRDS intéressement versé directement',          'Art. L136-1 CSS'),
('2026-01','2026-01-01','interessement','ir_if_pee',      0, 'IR = 0 si versé sur PEE/PERCO',                     'Art. L3315-2 Code travail'),

('2026-01','2026-01-01','participation','cap',        35325, 'Plafond individuel 2026 (75% PASS)',                'Art. L3324-5 Code travail'),
('2026-01','2026-01-01','participation','csg_crds',   0.097, 'CSG/CRDS participation',                            'Art. L136-1 CSS'),
('2026-01','2026-01-01','participation','ir_if_pee',      0, 'IR = 0 si versé sur PEE/PERCO',                     'Art. L3325-2 Code travail');

-- ════════════════ ACTIVE TAX RULES VIEW ════════════════
create or replace view public.active_tax_rules
with (security_invoker = true)
as
select *
from public.tax_rules
where version = (
  select version from public.tax_rules
  order by effective_date desc, version desc
  limit 1
);

-- ════════════════ SIMULATIONS ════════════════
create table public.simulations (
  id                  uuid primary key default gen_random_uuid(),
  link_id             uuid not null references public.candidate_links(id) on delete cascade,
  tmi                 numeric not null,
  seniority_years     integer not null,
  pee_contribution    numeric not null default 0,
  result_snapshot     jsonb not null,
  tax_rules_version   text not null default '2026-01',
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  unique (link_id)
);

alter table public.simulations enable row level security;

create policy "RH can read own org simulations"
  on public.simulations for select
  to authenticated
  using (
    link_id in (
      select id from public.candidate_links
      where organization_id = public.current_user_org()
    )
  );

create index idx_simulations_link on public.simulations(link_id);

-- ════════════════ INDEXES PERFORMANCE ════════════════
create index if not exists idx_packages_org_status      on public.packages(organization_id, status);
create index if not exists idx_packages_updated         on public.packages(updated_at desc);
create index if not exists idx_candidate_links_org      on public.candidate_links(organization_id);
create index if not exists idx_candidate_links_token    on public.candidate_links(token);
create index if not exists idx_candidate_links_package  on public.candidate_links(package_id);
create index if not exists idx_link_events_link         on public.link_events(link_id, created_at desc);
create index if not exists idx_link_events_type         on public.link_events(event_type);
create index if not exists idx_equity_devices_package   on public.equity_devices(package_id);
create index if not exists idx_savings_devices_package  on public.savings_devices(package_id);
create index if not exists idx_scenarios_package        on public.scenarios(package_id, display_order);
