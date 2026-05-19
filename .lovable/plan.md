La migration SQL est appliquée (≈40 nouvelles colonnes sur `packages`). Avant de réécrire ~4 500 lignes de code, je veux confirmer le scope car le configurateur actuel a 8 étapes et plusieurs tables liées (`equity_devices`, `savings_devices`, `scenarios`, `package_benefits`) qui ne sont pas mentionnées dans le prompt #20.

## Choix d'architecture à valider

**Option A — Remplacement complet (recommandé si tu veux vraiment la refonte)**
- Supprimer les 8 step components actuels
- Réécrire `PackageConfigContext` autour des nouveaux champs `packages.*`
- 5 nouvelles étapes : Le poste / Rémunération / Equity / Extras / Aperçu
- L'equity n'utilise plus `equity_devices` mais les colonnes `equity_*` sur `packages` (1 seul plan d'equity au lieu de N)
- On perd : scénarios de valorisation multi-horizons, dispositifs d'épargne séparés (PEE/PERCO), catalogue benefits par package (déjà couvert par `company_profile`)
- ⚠️ Les packages existants en BDD continueront de fonctionner en lecture mais seront édités via la nouvelle UI

**Option B — Refonte progressive**
- Garder le contexte et les tables liées
- Refactorer uniquement la séquence d'étapes et leur contenu
- Mapper les nouveaux champs UI vers les colonnes (`packages.fixed_salary` ⇄ `gross_salary`, etc.)
- Conserve les fonctionnalités existantes (scénarios, multi-equity)

## Plan technique (Option A)

1. **Nouveau contexte** `PackageConfiguratorContext` typé sur les colonnes ajoutées
2. **5 step components** :
   - `StepJob.tsx` — identité poste + contexte recrutement
   - `StepCompensation.tsx` — fixe + fourchette + `BenchmarkBadge` (live `salary_benchmarks`) + variable + signing bonus
   - `StepEquity.tsx` — type/quantité/strike/vesting/cliff/accélération/valorisation
   - `StepExtras.tsx` — télétravail override + équipement + formation + période d'essai + carrière + clauses
   - `StepReview.tsx` — récap + Total Compensation calculé (fixe + variable + valorisation `company_profile` TR/mutuelle/participation/PEE) + bouton génération lien
3. **Composant `BenchmarkBadge`** — query `salary_benchmarks` par `(job_family, seniority, location)`
4. **Helper `computeTotalCompensation`** — utilise `company_profile` pour valoriser TR, mutuelle, intéressement, PEE
5. **Stepper horizontal** au lieu du vertical actuel
6. **Sidebar aperçu temps réel** (fond Lin `#FAF8F5`)
7. **Suppression** des fichiers obsolètes : `Step0Job/Step1Fixed/StepBenefits/Step2Equity/Step3Savings/Step4Scenarios/Step5Preview/StepCompany`
8. **Save** : autosave debounce 800 ms sur `packages` directement (pas de `package_benefits`/`equity_devices`)

## Risques

- Les pages `/packages/$id` (détail, lettre d'offre, candidats) lisent peut-être `package_benefits`/`equity_devices`/`scenarios` — il faudra vérifier et adapter les lectures (sinon UI candidat cassée)
- `BenchmarkAnalysisCard` côté employeur référence déjà `gross_salary` — devra basculer sur `fixed_salary`
- Migration des packages existants : pas de backfill prévu (`gross_salary` → `fixed_salary`)

**Quelle option je pars ?** Si A, je confirme aussi : on garde un fallback pour afficher les anciens packages (lecture des colonnes legacy) ou on backfill ?