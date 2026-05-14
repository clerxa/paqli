# Prompt 9 — Plan d'implémentation

Note importante : ce projet est en TanStack Start (pas d'Edge Functions). Je remplace les `update-offer-status` et `send-message` par des **server functions** (`createServerFn`) — pattern déjà utilisé pour `trackLink`, `getPackagePublic`, etc.

Pour les emails : aucun fournisseur d'email n'est actuellement configuré. Je propose de **logger côté serveur** les notifications email (TODO Resend) pour ne pas bloquer la livraison. Si tu veux les emails réels, on activera Lovable Emails ou Resend en prompt suivant.

---

## 1. Migration DB

- `candidate_links` : ajouter `status`, `status_updated_at`, `decline_category`, `decline_reason` + index `(organization_id, status)`.
- Créer table `messages` (link_id, sender, content, read_at, created_at) avec RLS RH (org-scoped) + index `(link_id, created_at)`.
- Activer realtime sur `messages` et `candidate_links` (déjà actif `link_events`).

## 2. Server functions

- `src/lib/updateOfferStatus.functions.ts` — input `{ token, status, declineCategory?, declineReason? }`, met à jour `candidate_links`, insère `link_events` (`offer_accepted` / `offer_declined` / `decision_changed`).
- `src/lib/sendMessage.functions.ts` — input `{ token, content, sender }`. Si `sender='rh'`, exiger auth via `requireSupabaseAuth` + vérifier que le lien appartient à l'org. Si `sender='candidate'`, public via token. Insère `messages` + `link_events` (`message_candidate` / `message_rh`). Log notif email (TODO).
- Mettre à jour `getPackagePublic.functions.ts` : retourner `offerStatus`, `statusUpdatedAt`, `messages[]`.
- Mettre à jour `notify-rh` (route) avec les nouveaux types d'événements.

## 3. Vue candidat `/p/:token`

- Bloc "Votre décision" : 3 états (pending / accepted / declined) + 2 modales (Accept, Decline avec catégories chips + textarea 300c).
- Bloc messagerie : fil + composer (2000c).
- Wire vers `useCandidateLink` (étendu) + nouvelles server fns.

## 4. Dashboard / packages

- Étendre `useDashboard` et `usePackages` pour exposer `status` par lien.
- Badge statut (accepté/décliné/en attente) dans la liste des liens.
- `/packages/:id` : nouveau panneau "Activité du candidat" avec :
  - Hook `useLinkActivity(linkId)` — events + messages + status, realtime sur 3 tables.
  - `ActivityFeed` chronologique fusionné.
  - `RhMessagingPanel` pour répondre.
  - Toast quand status change.
- Card "Pourquoi les candidats déclinent" dans le dashboard si ≥1 refus.

## 5. Vérifications

- Lint Supabase après migration.
- Test E2E : créer lien → ouvrir `/p/:token` → décliner → vérifier fil d'activité côté RH.

---

Je lance la migration, puis les server fns, puis l'UI candidat, puis l'UI RH.