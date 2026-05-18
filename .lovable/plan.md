# Refonte page Paramètres — 4 onglets + Citations collaborateurs

## Vue d'ensemble

Restructurer `/settings` en 4 onglets distincts, ajouter une barre de complétude par section, et introduire la nouvelle fonctionnalité "Paroles de collaborateurs" (citations affichées côté candidat).

## Structure cible

```
Paramètres
├── [1] Mon entreprise     ← identité, présentation, chiffres, valeurs, citations, liens
├── [2] Défauts package    ← avantages, equity, épargne (OrgCatalogSections existant)
├── [3] Utilisateurs       ← équipe RH, rôles, invitations (existant)
└── [4] Plan & facturation ← abonnement, crédits (existant)
```

## Étape 1 — Migrations DB

1. **Table `employee_testimonials`** (id, organization_id, first_name, job_title, seniority_years, quote (max 280), quote_context, avatar_url, display_order, is_active, timestamps) + RLS "RH manage own org" + index.
2. **Bucket Storage `testimonial-avatars`** public + policies (upload authenticated, select public).
3. **Enrichir `organizations`** : `tagline`, `founded_year`, `employee_count`, `website_url`, `linkedin_url`, `wtj_url`.

## Étape 2 — Backend

- Étendre `getPackagePublic` pour retourner `testimonials` (citations actives, max 5, ordonnées).
- Module `src/lib/organizationCompleteness.ts` (calc par section : legal, presentation, keyFigures, values, testimonials).

## Étape 3 — Refonte UI Paramètres

- **`src/routes/_app/settings.tsx`** : refondre avec 4 onglets (Tabs shadcn ou nav custom alignée au design Paqli).
- **`src/components/paqli/settings/CompanySettingsTab.tsx`** (nouveau) : orchestre les sous-sections.
- **`src/components/paqli/settings/ProfileCompletenessBar.tsx`** (nouveau) : barre globale + 5 mini-barres.
- **`src/components/paqli/settings/SettingsSection.tsx`** (nouveau) : accordéon générique avec badge complétude.
- **Sous-sections** (composants internes ou dédiés) : LegalSection, PresentationSection, KeyFiguresSection, ValuesSection, SourcesSection — extraites du settings.tsx actuel.
- **`TestimonialsSection.tsx`** + `TestimonialCard.tsx` + `TestimonialForm.tsx` (nouveaux) avec upload Storage, validation, réordre, toggle, edit/delete, max 5.
- **`DefaultsTab.tsx`** (nouveau, wrap léger sur `OrgCatalogSections` existant) avec bandeau explicatif.

## Étape 4 — UI Candidat

- **`src/components/paqli/candidate/TestimonialsBlock.tsx`** (nouveau) : section "Ils travaillent chez {orgName}".
- Intégrer dans `src/routes/p/$token.tsx` au sein de la section culture/équipe (visible si ≥1 citation).

## Étape 5 — QA

- Type-check, smoke nav 4 onglets, ajout/edit/suppression citation, affichage côté candidat avec `is_active` true/false.

## Notes techniques

- Garder le design système Paqli existant (couleurs, typo serif, classes `field-input-c`, etc.).
- Pas de policy SELECT publique sur `employee_testimonials` — exposition via `getPackagePublic` (admin client serveur).
- L'upload avatar utilise le client browser Supabase + bucket public ; chemin `${organizationId}/${uuid}.${ext}`.
- Les sections existantes (legal/presentation/key figures/values/sources) sont extraites du fichier settings.tsx actuel sans en altérer la logique de save — juste réorganisées dans des accordéons.

## Confirmation requise

Migration DB à appliquer (création table + bucket + colonnes). Je lance la migration puis enchaîne avec le code une fois approuvée.
