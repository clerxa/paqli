
# Intégration VEGA RSU dans Paqli

## Objectif

1. **Moteur de calcul RSU fidèle à VEGA** : 6 régimes fiscaux, multi-plans, devise EUR/USD, seuil 300 k€ consolidé, abattements durée de détention, PFU sur PV de cession.
2. **Côté candidat** : valoriser le package avec un gain net réaliste (pas juste un brut équity flou).
3. **Côté RH** : permettre au RH de **comprendre** et **expliquer** ces régimes à un candidat/salarié — c'est un axe différenciant produit.

## Périmètre v1 — RSU uniquement

BSPCE reste sur la logique actuelle (sera fait dans une v2 dédiée).

---

## 1. Moteur de calcul (pure logic, client-side)

### Fichiers nouveaux

```text
src/lib/vega/types.ts                # RSUPlan, VestingLine, RSURegime, RSUCessionParams, résultats
src/lib/vega/rsuRegimes.ts           # inferRegimeFromYear, libellés FR, descriptions courtes
src/lib/vega/fiscalRules.ts          # constantes fiscales 2026 (PFU, PS, abattements, seuil 300k)
src/lib/vega/rsuCalculations.ts      # pipeline complet calculateRSUSimulation
src/lib/vega/__tests__/rsu.test.ts   # tests sur cas connus (1 plan par régime + multi-plans + seuil 300k)
```

### Pipeline (réplique fidèle VEGA)

- `computeConsolidatedTranches` : regroupe AGA_2017 + AGA_POST2018 par année fiscale → tranche A (≤300k€, prorata) / tranche B (>300k€)
- `computePlanResult` par plan :
  - Résolution date cession (simple/avancé)
  - PV de cession (avec conversion USD→EUR, écrasement PV négative à 0)
  - Fiscalité gain d'acquisition selon régime
  - Abattement durée de détention (2/8 ans) pour AGA_2015_2016 et AGA_2017
  - Fiscalité PV cession en PFU systématique
- Agrégation portfolio (brut, net, IR, PS, taux effectif)
- Mode avancé → `resultats_par_annee` avec `impact_bulletin` (NON_QUALIFIE = salaire)

### Différences assumées vs VEGA

- **Pas de connexion `global_settings`** : on hardcode les `fiscal_rules` 2026 dans `fiscalRules.ts`. Mise à jour annuelle = simple edit. (Si demandé plus tard, on bascule en table Supabase.)
- **Pas de persistance** des résultats (conforme VEGA), pas de stockage des inputs candidat non plus en v1 (le candidat simule à la volée à partir du plan déclaré par le RH).

---

## 2. Mapping vers le modèle Paqli existant

Le configurateur stocke aujourd'hui `EquityDeviceForm` (type, quantity, strikePrice, currentValuationM, vestingYears, cliffMonths). Pour RSU, on a besoin de plus :

### Migration DB (table `equity_devices`)

Ajouter colonnes :
- `award_year` (int) — année d'attribution → infère le régime
- `regime` (text) — `AGA_PRE2012` | `AGA_2012_2015` | `AGA_2015_2016` | `AGA_2017` | `AGA_POST2018` | `NON_QUALIFIE` (override possible si RH connaît mieux)
- `currency` (text, default 'EUR') — `EUR` | `USD`
- `conservation_end_date` (date, nullable) — pour abattement durée de détention
- `total_acquisition_gain` (numeric, nullable) — gain d'acquisition total estimé (= cours vesting × nb)

### Configurateur (StepNewEquity)

Quand `type = 'rsu'`, afficher les champs supplémentaires + un encart "Régime fiscal détecté" auto-calculé depuis `award_year`, avec dropdown override.

---

## 3. UI candidat — DEUX surfaces

### 3.1 Bloc résumé dans `/p/$token` (aperçu candidat existant)

Section "Gain net estimé equity" sous le bloc equity actuel :
- 3 cards : Pessimiste / Réaliste / Optimiste (utilise les scénarios déjà configurés au niveau org)
- Affichage : Brut → Impôts → **Net en poche**
- Petit lien "Détailler ma situation fiscale →" qui ouvre le modal

### 3.2 Modal "Simulateur fiscal" (nouveau)

`src/components/candidate/RSUSimulatorModal.tsx`

- Tab par plan si plusieurs RSU
- Inputs candidat : TMI, prix de cession, taux change USD/EUR (si plan USD), mode simple/avancé, date(s) cession
- Sortie : tableau détaillé par plan (gain acquisition, PV, IR, PS, contrib, net) + agrégat portfolio
- Disclaimer MNPI/non-conseil

---

## 4. Couche pédagogique RH — 3 surfaces

### 4.1 Tooltips contextuels dans le configurateur

Sur chaque champ RSU dans `StepNewEquity` : icône `(i)` qui ouvre un popover avec explication courte (2-3 lignes) + lien "En savoir plus" qui ouvre le panneau latéral.

### 4.2 Panneau latéral "Comprendre l'equity"

`src/components/paqli/configurator/EquityKnowledgePanel.tsx`

Drawer (Sheet shadcn) accessible depuis un bouton dans le header du step equity :
- Fiches par régime (6) : qui est concerné, comment c'est imposé, exemple chiffré
- FAQ : "C'est quoi le cliff ?", "Différence PFU vs barème ?", "Pourquoi le seuil 300k€ ?", etc.
- Glossaire : Vesting, Strike, MNPI, AGA, PEE/PERCO, etc.

Contenu rédigé en markdown statique dans `src/lib/vega/knowledge.ts`.

### 4.3 Assistant IA equity (RH uniquement)

`src/components/paqli/configurator/EquityCoach.tsx` + `src/lib/equityCoach.functions.ts` (server function avec Lovable AI, modèle `google/gemini-2.5-flash`).

- Bouton "Demander à l'assistant equity" dans le panneau
- Le system prompt inclut **toute la doc VEGA** + les valeurs du package en cours
- RH pose des questions en langage naturel : "Mon candidat a 35 ans et gagne 80k brut, quel TMI prendre ?", "Comment expliquer le seuil 300k€ simplement ?"
- Logs dans `ai_logs` (table existante)

---

## 5. Détails techniques

### Calcul TMI (Tranche Marginale d'Imposition) candidat

Pour le simulateur candidat, on demande au candidat son TMI directement (dropdown 0/11/30/41/45%) avec une mini-aide "Comment connaître mon TMI ?". Pas de calcul automatique depuis le revenu en v1 (trop d'inputs).

### Année fiscale & valeurs `fiscal_rules` 2026

```text
pv_cession_pfu_ir       12.8
pv_cession_ps           17.2
pv_abattement_2ans      50
pv_abattement_8ans      65
abattement_seuil        300000
aga_pre2012 ir/ps/c     30 / 17.2 / 10
aga_2012_2015 ps/c      9.7 / 10
aga_2015_2016 ps        17.2
aga_2017 ps             17.2
aga_post2018 abat./ps   50 / 17.2
nq ps/c                 9.7 / 10
```

### Inférence régime (`inferRegimeFromYear`)

```text
< 2012                    → AGA_PRE2012
2012 → août 2015          → AGA_2012_2015
août 2015 → décembre 2016 → AGA_2015_2016
2017                      → AGA_2017
>= 2018                   → AGA_POST2018
hors AGA (manuel)         → NON_QUALIFIE
```

---

## 6. Plan d'exécution (ordre de livraison)

1. **Migration DB** equity_devices (+ types Supabase regen)
2. **Moteur VEGA** : types, fiscalRules, regimes, calculations + tests
3. **Configurateur** : champs RSU étendus dans StepNewEquity
4. **Knowledge base** (`knowledge.ts`) : fiches, FAQ, glossaire
5. **Panneau RH "Comprendre"** (Sheet) + tooltips champs
6. **Bloc candidat résumé** dans `/p/$token`
7. **Modal simulateur candidat** détaillé
8. **Assistant IA equity** (server function + UI)

---

## 7. Hors scope v1 (explicitement)

- BSPCE refonte (reste tel quel)
- AGA, RSU US (RSUs Restricted Stock Units côté entreprises US cotées) — le moteur les couvre via régime, mais l'UI configurateur reste générique
- Mise à jour automatique annuelle des `fiscal_rules` (manuelle pour l'instant)
- Calcul TMI auto depuis revenu candidat
- Stockage des simulations candidat

---

**Tu valides ce plan ?** Si oui je commence par la migration DB + le moteur de calcul (étapes 1-2), ce qui débloque tout le reste.
