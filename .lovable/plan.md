## Prompt 16 — Compte à rebours & date limite de décision

### 1. Base de données (migration)
Ajouter à `candidate_links`:
- `decision_deadline timestamptz`
- `deadline_notified_48h boolean default false`
- `deadline_notified_24h boolean default false`
- `deadline_notified_expired boolean default false`

### 2. Configurateur — Étape 5
Modifier `src/components/paqli/configurator/Step5Preview.tsx` :
- Toggle "Date limite de décision"
- Chips de délai rapide (3j / 5j / 1 sem / 2 sem / Personnalisé)
- Sélecteur datetime-local si personnalisé
- Aperçu formaté en français + note pédagogique
- État stocké dans `PackageConfigContext` ou local + sauvegardé via `generateCandidateLink`

Modifier `src/lib/candidateLinks.ts` :
- `generateCandidateLink` accepte `decisionDeadline?: Date | null`
- Insère dans `candidate_links.decision_deadline`

### 3. Server function publique
`src/lib/getPackagePublic.functions.ts` :
- Ajouter `decision_deadline` au select et au retour (`decisionDeadline`)

`src/hooks/useCandidateLink.ts` :
- Exposer `decisionDeadline` dans `CandidateLinkData`

### 4. Vue candidat (`src/routes/p/$token.tsx`)
- Créer composant `DecisionDeadlineBanner` (et helpers `calcTimeLeft`, `CountdownDisplay`)
- Afficher en haut, sous le hero
- Bloc décision remplacé par message d'expiration si deadline passée + statut pending
- Messagerie reste accessible

### 5. Dashboard RH
- Badge deadline dans la liste des liens (page détail package `_app/packages/$id/index.tsx`)
- Composant `DeadlineManager` : +3j / +7j / supprimer
- Hook `useDashboard` : ajouter alertes `deadline_urgent` (<24h) et `deadline_expired` (<48h)
- Mapper ces nouveaux types dans `FollowUpAlertsCard`

### 6. Notifications automatiques (TanStack server route)
**Note** : la stack utilise TanStack server routes, pas Supabase Edge Functions. Créer :
`src/routes/api/public/hooks/deadline-notifier.ts` :
- Lit les liens éligibles via `supabaseAdmin`
- Envoie emails via Lovable Emails / fallback console-log si non configuré
- Met à jour les flags `deadline_notified_*`

Cron via `pg_cron` toutes les heures (insert-only SQL via outil supabase insert).

### 7. Tests build
Vérifier qu'il n'y a pas d'erreurs TypeScript après les modifs.

---

### Notes techniques
- Email infrastructure : si non configurée, on log uniquement et on marque flags. Proposer setup_email_infra à l'utilisateur dans une étape ultérieure.
- Réinitialiser `deadline_notified_*` à false lors d'une prolongation depuis le dashboard.
- Alerte type ajoutée à l'union `FollowUpAlert["type"]`.
