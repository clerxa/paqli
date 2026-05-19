## Doublons identifiés

J'ai cartographié les chevauchements entre les 3 onglets de paramètres :

```text
                      Mon entreprise        Marque & témoignages       Défauts package
                      (company_profile)     (organizations)            (org_*_catalog)
---------------------------------------------------------------------------------------
Nom légal             legal_name            name                       —
Nom de marque         brand_name            (name)                     —
Description           description           description                —
Site web              website               website_url                —
LinkedIn              —                     linkedin_url               —
WTJ                   —                     wtj_url                    —
Année de création     founding_year         founded_year               —
Taille / effectif     size_range            employee_count             —
Secteur               industry              —                          —
Stade                 stage                 —                          —
Tickets restaurant    meal_voucher_*        —                          (peut être ajouté)
Mutuelle              health_insurance_*    —                          (peut être ajouté)
Transport             transport_*           —                          (peut être ajouté)
Formation             training_budget_*     —                          (peut être ajouté)
PEE / PERCO           pee_enabled, …        —                          org_savings_catalog
Equity                —                     —                          org_equity_catalog
```

Trois types de problèmes :
1. **Identité dédoublée** entre `company_profile` (onglet 1) et `organizations` (onglet 2)
2. **Avantages / épargne** présents en flag dans `company_profile` ET pouvant être ajoutés à la main dans le catalogue "Défauts package"
3. Paq ne lit aujourd'hui que `packages` + `company_profile`. Il ignore `organizations` (tagline, valeurs, culture, key_figures, testimonials) et le catalogue d'avantages par défaut.

## Plan

### 1. Onglet "Mon entreprise" = source de vérité administrative
On garde tel quel : identité légale, secteur/stade/taille, conventions, santé, TR, transport, télétravail, congés, épargne, révision salariale, formation.

### 2. Onglet "Marque & témoignages" = uniquement branding & narratif
Je retire les champs qui dupliquent l'onglet 1 :
- **Supprimés** : description, founded_year, employee_count, website_url, linkedin_url, wtj_url, name (input)
- **Conservés** : tagline, logo, key_figures (chiffres à afficher au candidat), values, culture_note, source_urls (pour génération IA), links, SIRET + adresse, testimonials
- Le `organizations.name` est édité dans l'onglet 1 (champ `brand_name`) et synchronisé automatiquement.
- Petit bandeau qui renvoie vers "Mon entreprise" pour les infos générales.

### 3. Onglet "Défauts package" = uniquement equity & savings
Je retire la section "Avantages" du catalogue (elle dupliquait TR/mutuelle/transport déjà gérés dans l'onglet 1). Les avantages d'un package sont désormais :
- soit hérités automatiquement de `company_profile` (TR, mutuelle, transport, télétravail, CSE…)
- soit override par poste dans l'étape "Extras" du configurateur (déjà en place)

L'onglet "Défauts package" reste utile pour : equity templates (BSPCE/AGA/RSU/ESPP) et savings (PEE/PERCO/intéressement/participation) — ce sont des "modèles" pré-cuits insérés à la création.

### 4. Paq lit toutes les sources
J'enrichis `candidateAssistant.functions.ts` pour charger en plus :
- `organizations` (tagline, key_figures, values, culture_note, links)
- `employee_testimonials` (top 5 actifs)
- `org_equity_catalog` + `org_savings_catalog` (dispositifs disponibles côté entreprise même si non sélectionnés sur ce package précis)

Ajout dans le system prompt d'une section "CULTURE & MARQUE" et d'une section "DISPOSITIFS DISPONIBLES DANS L'ENTREPRISE" qui complètent les données déjà présentes.

### 5. Suppression de la duplication name/brand_name
- Le champ "Nom d'entreprise" éditable reste dans l'onglet "Mon entreprise" sous `brand_name` (déjà existant).
- À chaque save de `company_profile`, on sync `organizations.name = brand_name || legal_name`.
- Le `name` de l'organisations table reste accessible mais devient en lecture seule dans l'UI.

## Fichiers touchés (UI seulement, pas de migration DB)

- `src/routes/_app/settings.tsx` → CompanyTab : retirer champs dupliqués, ajouter bandeau d'orientation
- `src/components/paqli/settings/CompanyProfileTab.tsx` → ajouter sync auto vers `organizations.name` au save
- `src/components/paqli/settings/OrgCatalogSections.tsx` → retirer la section Avantages
- `src/lib/candidateAssistant.functions.ts` → fetch + injection des données org/testimonials/catalogues dans le prompt

## Hors scope (volontaire)
- Pas de migration DB ni de suppression de colonnes : les anciennes colonnes (`organizations.description`, etc.) sont conservées pour ne pas casser les données existantes — elles deviennent simplement non éditables et seront lues comme fallback si jamais `company_profile` n'est pas rempli.
- Pas de refonte du configurateur de package : la logique override-par-poste existe déjà.

OK pour exécuter ?