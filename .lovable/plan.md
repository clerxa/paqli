# Prompt 14 — Analyse comportementale candidat

Implémentation du tracking comportemental fin, du score d'engagement IA, et de la vue "Comportement" dans le dashboard RH. Adapté à la stack TanStack Start + Lovable Cloud (pas d'Edge Functions Deno : on utilise des **server functions** + **server routes publiques** + **Lovable AI Gateway** au lieu de l'API Anthropic directe).

## 1. Migration base de données

**Enrichir `candidate_links`** :
- `behavior_data jsonb default '{}'`
- `engagement_score integer`
- `engagement_label text` (`cold` | `lukewarm` | `warm` | `hot`)
- `intent_prediction text` (`likely_accept` | `uncertain` | `likely_decline` | `unknown` | `accepted` | `declined`)
- `intent_computed_at timestamptz`
- `return_visits integer default 0`
- `time_on_page_total integer default 0` (secondes cumulées)

**Nouvelle table `behavior_events`** :
- `id uuid pk`, `link_id uuid fk → candidate_links(id) on delete cascade`
- `event_type text` (`section_view`, `section_time`, `simulation_change`, `scenario_view`, `external_link`, `page_exit`, `page_return`)
- `section text nullable`, `value text nullable`, `duration_s integer nullable`, `created_at timestamptz default now()`
- RLS : RH peuvent lire les events de leur org (via `current_user_org()`), pas d'INSERT direct (passe par server route publique avec service role)
- Index : `(link_id, created_at desc)` et `(event_type)`

## 2. Tracking côté serveur (route publique)

**`src/routes/api/public/track-behavior.ts`** — server route POST qui :
- Valide le payload avec Zod (token, eventType enum, section, value, durationS)
- Vérifie le lien via `supabaseAdmin` par token
- Insère dans `behavior_events`
- Met à jour les colonnes agrégées sur `candidate_links` (`return_visits`, `time_on_page_total`, `opened_at`, `simulated_at` selon eventType)
- Déclenche `compute-engagement` en fire-and-forget (appel interne via fetch absolu)
- CORS ouvert (la page candidat est publique)

## 3. Server function `computeEngagementFn`

**`src/lib/engagement.functions.ts`** — `createServerFn({ method: "POST" })` :
- Input : `{ linkId: string }`
- Lit `candidate_links` + `link_events` + `behavior_events`
- Calcule un score 0-100 selon les règles du prompt (ouverture, retours, temps total, simulations, scénarios consultés, AI questions, messages, RDV, liens externes, malus si `declined`)
- Détermine `engagement_label` (cold/lukewarm/warm/hot) et `intent_prediction`
- Met à jour `candidate_links` (score, label, intent, computed_at)
- Pas de middleware auth (appelée depuis `track-behavior` via service role)

**`src/routes/api/public/compute-engagement.ts`** — server route qui wrap la même logique pour appel HTTP interne depuis `track-behavior`.

## 4. Server function `interpretBehaviorFn` (Lovable AI)

**`src/lib/behaviorInterpret.functions.ts`** — protégée par `requireSupabaseAuth` :
- Input : `{ linkId }`
- Vérifie que le link appartient à l'org du user (via `current_user_org()`)
- Construit le `behaviorSummary` (score, intent, visites, temps, scénarios consultés, sections top 3, etc.)
- Appelle Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, modèle `google/gemini-2.5-flash`, `LOVABLE_API_KEY`) avec le system prompt du brief (factuel, nuancé, bienveillant, 3-4 phrases)
- Retourne `{ interpretation: string }`

## 5. Hooks frontend

- **`src/hooks/useBehaviorTracker.ts`** : helper `track()` qui POST vers `/api/public/track-behavior` (avec `sendBeacon` pour `page_exit`). Expose `trackSectionView`, `trackSectionTime`, `trackSimulationChange`, `trackScenarioView`, `trackExternalLink`. Gère `visibilitychange` + `beforeunload` + Intersection Observer init dans le composant.
- **`src/hooks/useBehaviorData.ts`** : charge `behavior_events` + `candidate_links` enrichi, avec realtime sur INSERT `behavior_events` et UPDATE `candidate_links`.

## 6. Intégration page candidat `/p/$token`

- Wrapper le contenu dans des `<section data-section="...">` (hero, poste, equipe_culture, simulation, equity_scenarios, epargne, faq, assistant_ia, messagerie, decision)
- Brancher Intersection Observer (threshold 0.3) → `trackSectionView` / `trackSectionTime`
- Brancher `trackSimulationChange` sur les changements TMI/ancienneté/PEE (debounce 1s pour le slider)
- Brancher `trackScenarioView` sur les scénarios equity au clic
- Brancher `trackExternalLink` sur les liens externes (Glassdoor, WTJ, LinkedIn)

## 7. Composants RH

- **`EngagementBadge`** : badge visuel (icône + label + score + intent) avec tokens design
- **`BehaviorView`** : panneau dans le détail package
  - Score global avec barre de progression
  - 3 stats : visites, temps total, nb simulations
  - Barres temps/section
  - Scénarios equity consultés (chips ✓/○)
  - TMI testées (chips actives/inactives) + "compare activement" si ≥2
  - `AIBehaviorInterpretation` avec génération à la demande
- Affichage du badge dans la liste des liens dans `/packages/$id`

## 8. Notes techniques

**Stack** :
- Pas d'Edge Functions Deno → server routes TanStack (`/api/public/track-behavior`, `/api/public/compute-engagement`) + server functions (`computeEngagementFn`, `interpretBehaviorFn`)
- L'IA passe par **Lovable AI Gateway** (déjà la décision actée du Prompt 13 si on souhaite, mais ici je garde Anthropic comme tout le projet via `claudeApi.server.ts` pour cohérence — dis-moi si tu préfères basculer)
- `sendBeacon` cible bien la route publique HTTP (pas un server fn RPC)
- Le score est recalculé à chaque insert dans `behavior_events` (appel fire-and-forget depuis `track-behavior`) et reste calculable manuellement

**RGPD** :
- Pas d'IP stockée, pas de fingerprint, pas de tracking hors page
- Les events sont liés au link (anonyme côté candidat)
- Mention CGU à ajouter (légère modif `src/components/paqli/LegalNotice.tsx`)

## Question avant build

Je pars sur **Anthropic Claude** (cohérent avec `claudeApi.server.ts` du Prompt 13) pour `interpretBehaviorFn` ? Ou bascule sur Lovable AI Gateway (gratuit) ?
