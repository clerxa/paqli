-- Risque 1 : sécurité des routes publiques
-- 1. Augmenter l'entropie du token (64 -> 128 bits) sur les nouveaux liens
alter table public.candidate_links
  alter column token set default encode(extensions.gen_random_bytes(16), 'hex');

-- 2. Compteur de questions IA par lien candidat
alter table public.candidate_links
  add column if not exists ai_questions_count integer not null default 0,
  add column if not exists ai_questions_cap   integer not null default 50;

create index if not exists idx_candidate_links_ai_count
  on public.candidate_links(ai_questions_count)
  where ai_questions_count > 0;

comment on column public.candidate_links.ai_questions_count
  is 'Nombre de questions posées à l''assistant IA — incrémenté atomiquement avant chaque appel';
comment on column public.candidate_links.ai_questions_cap
  is 'Cap maximum de questions IA pour ce lien. Défaut 50.';