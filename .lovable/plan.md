# Refonte page candidat en onglets + profil entreprise

## 1. Profil entreprise (paramétré au niveau du compte)

### Base de données
Nouvelles colonnes sur `organizations` :
- `description` (text) — pitch / présentation / produit
- `key_figures` (jsonb) — `[{label, value}]` (effectif, création, levée, croissance…)
- `values` (text[]) — valeurs
- `culture_note` (text) — manifeste / ambiance
- `links` (jsonb) — `[{label, url, type}]` (site, LinkedIn, WTJ, Glassdoor, presse…)
- `source_urls` (text[]) — liens web utilisés par l'IA pour générer le contenu

RLS : déjà en place (membres voient leur org, admins éditent).

### Page Paramètres (`/settings`)
Refonte de la page actuelle (qui n'a que des champs mock) en vraie page d'édition du profil entreprise :
- Section "Liens sources" : champ multi-URL (ajout/suppression de liens) + bouton **« Générer avec l'IA »**
- Section "Présentation & produit" (textarea)
- Section "Chiffres clés" (liste éditable label/valeur)
- Section "Valeurs & culture" (chips + textarea)
- Section "Liens & médias" (liste éditable label/url)
- Auto-save type configurateur de package

### Génération IA
Nouveau server function `generateCompanyProfile.functions.ts` :
- Input : `urls: string[]`
- Pour chaque URL : scrape via `fetch` + extraction texte (HTML simple, pas besoin de Firecrawl pour démarrer — on peut basculer plus tard si besoin)
- Concatène les contenus, passe à Lovable AI Gateway (`google/gemini-3-flash-preview`) avec tool calling pour extraire les 4 blocs en JSON structuré
- Renvoie le profil ; le client fait l'upsert sur `organizations`

## 2. Page candidat en onglets

### Refonte `src/routes/p/$token.tsx`
Remplacer le scroll long actuel par un système d'onglets :

```text
┌──────────────────────────────────────────────┐
│ Header (logo entreprise, titre du poste)     │
├──────────────────────────────────────────────┤
│ [Offre] [Flexibilité] [Équipe & culture]     │
│ [ ✦ PACKAGE ✦ ] [Questions] [Next steps]     │  ← Package mis en avant
└──────────────────────────────────────────────┘
```

**Mise en avant de l'onglet Package** :
- Couleur d'accent (lavande / aubergine), badge ou pastille
- Police plus grande, bordure visible
- Bouton plein vs ghost pour les autres

**Contenu des onglets** (mapping depuis le contenu existant de la page) :
- **Offre** : `job_summary`, `missions`, `stack`, `contract_type`, `start_date`
- **Flexibilité** : `remote_policy`, `remote_days`, `remote_guaranteed`, `flexible_hours`, `location_*`
- **Équipe & culture** : `team_*`, `manager_style`, `company_values`, `culture_note`, `growth_paths`, `training_budget`, `onboarding_note`, `glassdoor_url`, `wtj_url`
- **Entreprise** (nouvel onglet, entre Offre et Flexibilité) : `organizations.description`, `key_figures`, `values`, `culture_note`, `links`
- **Package** : `SalaryBreakdown` (fixe + variable simulé + benefits + equity scenarios + savings)
- **Questions** : zone de chat existante (`messages`)
- **Next steps** : `process_steps`, `process_duration`, `DecisionBlocks` (accept / counter-offer / decline)

### Récupération des données entreprise
Étendre `getPackagePublic.functions.ts` pour renvoyer aussi le profil étendu de `organizations` (description, key_figures, values, culture_note, links).

### URL deep-link
Onglet actif synchronisé via search param (`?tab=package`) pour que l'employeur puisse pointer un candidat directement sur le package, et que les liens partagés conservent l'onglet.

## 3. Aperçu côté employeur
La preview existante (page `/packages/$id`) doit aussi afficher la page candidat avec les onglets pour que l'entreprise voie exactement ce que recevra le candidat.

## Ordre d'implémentation
1. Migration DB (colonnes `organizations`)
2. Server fn `generateCompanyProfile` + lecture étendue dans `getPackagePublic`
3. Refonte page `/settings` (édition + génération IA)
4. Refonte `src/routes/p/$token.tsx` en onglets (composant `CandidateTabs`)
5. Aligner la preview employeur sur la nouvelle structure

## Détails techniques
- **Tabs** : composant local custom (cohérent avec le design Paqli) ou `@/components/ui/tabs` (shadcn) si déjà présent
- **Scrape** : `fetch` + regex pour stripper HTML ; `Response.text()` ; cap à 50KB par URL pour éviter de saturer le contexte LLM
- **Tool calling Lovable AI** : schéma JSON strict pour `description`, `key_figures[]`, `values[]`, `culture_note`, `links[]`
- **Pas de breaking change** sur les packages : on ajoute, on ne retire rien