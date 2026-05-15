## Objectif

Transformer l'étape "Avantages" en moteur de Total Compensation : chaque avantage est traduit en € (ce que le candidat ne sortira pas de sa poche), avec 3 types de valeur (fixe / estimé / qualitatif) et 9 catégories.

## 1. Base de données

Migration `package_benefits` :
- Colonnes : `package_id`, `benefit_key`, `category`, `value_type` (fixed/estimated/qualitative), `monthly_value`, `annual_value`, `employer_share`, `custom_label`, `custom_note`, `display_order`
- RLS : RH gère les avantages de son org via `packages.organization_id`
- Index sur `(package_id, display_order)`
- **Conserver** la colonne `packages.benefits` JSONB pour rétrocompatibilité

## 2. Catalogue (`src/lib/benefitCatalog.ts`)

- Types `BenefitCategory`, `ValueType`, `BenefitDefinition`
- `BENEFIT_CATALOG` : 30+ avantages dans 9 catégories (santé, sport, mental, mobilité, food, formation, famille, équipement, financier+)
- `CATEGORY_LABELS`, `GYMLIB_LEVELS` (4 niveaux)
- Helpers : `getBenefitDef`, `estimateBenefitValue`, `buildSavingsMessage`

## 3. Configurateur — nouvelle étape `Avantages`

- Insérer entre étape 1 (Fixe) et étape 2 (Equity) → stepper passe à 7 étapes
- Mettre à jour : `Stepper.tsx`, `Configurator.tsx` (switch case), `packageConfig.ts` (validation + type `benefits: PackageBenefit[]`), `PackageConfigContext.tsx` (load/save vers `package_benefits`)
- Nouveau composant `StepBenefits.tsx` :
  - Onglets de catégories
  - Cards toggleables par avantage (icône, label, message d'économie, valeur annuelle, checkbox)
  - Saisie de montant pour `inputType: 'amount'`, sélecteur niveaux pour GymLib
  - Header running total + récap Total Compensation en bas

## 4. Vue candidat — `TotalCompensationBlock`

- Nouveau composant remplaçant l'ancien bloc estimation dans `src/routes/p/$token.tsx`
- Hero : Total Compensation annuel + équivalent mensuel
- 4 couches : rémunération directe / épargne salariale / avantages valorisés / qualitatifs (chips)
- Badge "Ce que vous n'avancez pas", mention "estimé" sur les valeurs approximées
- Phrase d'impact "+X% équivalent fixe brut"

## 5. Moteur de calcul

- `calcEngine.functions.ts` : remplacer `benefits_estimate` (ancien calc JSONB) par `calcBenefitsTotal(benefits[])` lisant `package_benefits`
- Charger `package_benefits` dans la query du link
- Ajouter `benefits_total` et `benefits_breakdown` au snapshot result
- `clientCalc.ts` : exposer même logique côté client pour le configurateur preview

## Détails techniques

- RLS via la fonction existante `current_user_org()` (et non sous-requête `profiles`)
- Ne pas casser `PreviewPanel.tsx` ni `SalaryBreakdown.tsx` existants — ils continuent d'utiliser le total agrégé
- Migration : ne PAS supprimer la colonne `benefits` JSONB ; la lecture lit en priorité `package_benefits` puis fallback sur l'ancien JSONB si vide
- Côté `Step5Preview` / vue candidat, le total inclut maintenant `benefitsTotal` du nouveau catalogue

## Hors scope (ce prompt)

- Migration des données existantes du JSONB vers `package_benefits`
- AI prompts mis à jour pour parler des avantages valorisés (sera un prompt suivant si besoin)
