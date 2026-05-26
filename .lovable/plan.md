## Objectif

Ajouter un simulateur equity simple dans le configurateur (étape 3) et sur la page candidat, distinct du module RSU/VEGA déjà en place. Deux modes : entreprise cotée (cours via Yahoo Finance) ou non cotée (valorisation + 3 scénarios à 4 ans).

## 1. Migration DB

Ajout sur `packages` :
- `equity_ticker text`, `equity_is_listed boolean default false`
- `equity_company_valuation bigint`, `equity_total_shares bigint`, `equity_last_round_date date`
- `equity_scenario_bear/base/bull numeric(4,2)` (défauts 1 / 3 / 7)
- `equity_last_price numeric(12,4)`, `equity_last_price_currency text default 'EUR'`, `equity_price_fetched_at timestamptz`

Mise à jour de `src/lib/packageConfig.ts` + `packageService.ts` pour mapper ces champs.

## 2. Calculs côté client

Nouveau fichier `src/lib/equityCalc.ts` :
- `computeEquityValuation(input)` → prix/action, valeur brute, schedule de vesting (cliff + années), scénarios bear/base/bull pour non cotée
- Net estimé = brut × 0.70 (PFU 30%) — purement indicatif

## 3. Server function — cours boursier

`src/lib/equityPrice.functions.ts` : `fetchEquityPrice({ ticker })` qui appelle Yahoo Finance v8 (`query1.finance.yahoo.com/v8/finance/chart/{TICKER}`), renvoie `{ found, ticker, name, price, currency, fetchedAt }`. Pas de clé requise.

## 4. Configurateur — étape Equity (StepNewEquity)

Sous chaque dispositif d'equity, ajouter une section "Valorisation" :
- Toggle `coté / non coté`
- **Coté** : input ticker + bouton "Vérifier" (appelle `fetchEquityPrice`), pastille verte avec nom + prix + date si trouvé
- **Non coté** : valorisation entreprise (€), total actions diluées, date dernière levée (optionnel), 3 sliders scénarios (bear/base/bull)
- Carte récap temps réel : valorisation actuelle + planning de vesting (cliff, an 2, an 3, fully vested), + tableau 3 scénarios si non coté
- Disclaimer indicatif PFU 30%

## 5. Page candidat — EquityValuationCard

Nouveau `src/components/candidate/EquityValuationCard.tsx` (design Paqli : fond brume `#F0EBE8`, DM Serif Display 32px pour la valeur principale, aubergine `#2D2640`). Intégré dans `PackageCompositionView` à côté des cartes RSU existantes. Affiche valeur actuelle (brut + net PFU), schedule vesting, et badges scénarios rouge/jaune/vert si non coté. Animation reveal stagger.

Cas vides gérés (pas d'equity → null ; valorisation manquante → message vers Paq).

## 6. Paq (assistant candidat)

Dans `src/lib/candidateAssistant.functions.ts`, enrichir le system prompt avec le bloc equity valorisé (valeur brute, après cliff, fully vested, et les 3 scénarios si non coté), pour que Paq puisse répondre aux questions equity en s'appuyant sur les chiffres.

## 7. Hors périmètre

Pas de gestion multi-plans, pas de FIFO, pas de régimes fiscaux détaillés (le module RSU académie reste séparé pour ça), pas de persistance des simulations, pas de cours temps réel continu.

## Fichiers touchés

**Créés** : `src/lib/equityCalc.ts`, `src/lib/equityPrice.functions.ts`, `src/components/candidate/EquityValuationCard.tsx`, `supabase/migrations/<ts>_equity_simulator.sql`
**Édités** : `src/lib/packageConfig.ts`, `src/lib/packageService.ts`, `src/components/paqli/configurator/StepNewEquity.tsx`, `src/components/paqli/candidate/PackageCompositionView.tsx`, `src/lib/candidateAssistant.functions.ts`

Une fois le plan validé, j'exécute la migration puis je crée/édite les fichiers en parallèle.
