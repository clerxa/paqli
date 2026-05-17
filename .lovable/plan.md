# Centraliser les avantages, equity et épargne dans les paramètres entreprise

## Objectif

Aujourd'hui, à chaque création de package, l'utilisateur doit re-saisir les mêmes avantages, dispositifs equity et épargne salariale. On déplace la **configuration structurelle** au niveau de l'entreprise (Paramètres), et on garde uniquement les **montants** au niveau du package.

## Principe

- **Entreprise** = catalogue : quels avantages/dispositifs sont disponibles dans cette boîte.
- **Package** = sélection + valeurs : on coche dans le catalogue ce qui s'applique au candidat, on remplit les montants.

## Nouveaux écrans (Paramètres → Mon entreprise)

Trois nouvelles sections sous l'onglet existant « Mon entreprise » :

### 1. Avantages proposés
Liste éditable des avantages dispo (tickets resto, mutuelle, transport, sport, garde d'enfants, etc.) avec :
- libellé, catégorie, valeur par défaut (mensuelle ou annuelle), part employeur par défaut
- bouton « + Ajouter un avantage »

### 2. Dispositifs d'equity disponibles
Liste des types d'instruments que l'entreprise utilise (BSPCE, AGA, stock-options, BSA…) avec leurs paramètres structurels :
- type, vesting (années), cliff (mois), prix d'exercice par défaut, valorisation actuelle
- pas de quantité ici — la quantité reste dans le package

### 3. Épargne salariale disponible
Liste des dispositifs (PEE, PERCOL, intéressement, participation, abondement…) avec :
- type, taux d'abondement par défaut, plafond, rendement moyen 3 ans
- pas de contribution salarié ici — elle reste dans le package

## Configurateur de package (simplification)

Les trois étapes existantes (`StepBenefits`, `Step2Equity`, `Step3Savings`) passent d'un mode « tout saisir » à un mode « cocher dans le catalogue + compléter les montants » :

- Affichage du catalogue entreprise comme liste de cases à cocher pré-remplies avec les valeurs par défaut.
- L'utilisateur peut overrider la valeur pour ce package précis.
- Bouton « + Ajouter (ponctuel) » pour ajouter un élément hors-catalogue sans polluer le catalogue entreprise.
- Si le catalogue est vide, on garde le mode actuel + un message « Configurez vos avantages dans Paramètres pour gagner du temps ».

## Détails techniques

### Migration DB — 3 nouvelles tables

```text
org_benefit_catalog
  id, organization_id, benefit_key, category, custom_label,
  value_type (fixed|percent), monthly_value, annual_value,
  employer_share, display_order

org_equity_catalog
  id, organization_id, type (bspce|aga|so|bsa|other),
  vesting_years, cliff_months, default_strike_price,
  default_valuation_m, special_conditions, display_order

org_savings_catalog
  id, organization_id, type (pee|percol|interessement|participation|abondement|other),
  default_matching_rate, default_cap_amount, default_avg_3y, display_order
```

RLS : SELECT pour tous les membres de l'org, INSERT/UPDATE/DELETE pour les admins (même pattern que la table `competitors`).

### Fichiers à modifier

- `src/routes/_app/settings.tsx` — ajouter 3 sous-sections dans `CompanyTab`
- `src/lib/orgCatalog.functions.ts` (nouveau) — serverFn pour CRUD catalogue
- `src/components/paqli/configurator/StepBenefits.tsx` — charger catalogue org, mode cases à cocher
- `src/components/paqli/configurator/Step2Equity.tsx` — idem pour equity
- `src/components/paqli/configurator/Step3Savings.tsx` — idem pour épargne
- `src/lib/packageConfig.ts` — pas de changement de schéma package (les `equity_devices` / `savings_devices` / `package_benefits` continuent de stocker ce qui est sélectionné pour ce package)

### Hors scope

- Pas de migration automatique des packages existants
- Pas de modification du rendu côté candidat (`/p/$token`)
- Pas de refonte visuelle des étapes — uniquement le mode de saisie
