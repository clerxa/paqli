/**
 * VEGA — Base de connaissance equity pour les RH Paqli.
 * Contenu pédagogique exposé dans le panneau "Comprendre l'equity",
 * les tooltips champ et le system prompt de l'assistant IA.
 */
import type { RSURegime } from "./types";

export interface RegimeKnowledge {
  regime: RSURegime;
  titre: string;
  qui: string;
  fiscalite: string;
  exemple: string;
}

export const REGIME_KNOWLEDGE: Record<RSURegime, RegimeKnowledge> = {
  AGA_PRE2012: {
    regime: "AGA_PRE2012",
    titre: "AGA — Attributions avant 2012",
    qui: "Salariés ayant reçu des Actions Gratuites attribuées avant le 28 septembre 2012.",
    fiscalite:
      "Régime forfaitaire dérogatoire : IR à 30 % + prélèvements sociaux 17,2 % + contribution salariale 10 %. Indépendant du TMI personnel.",
    exemple:
      "10 000 € de gain d'acquisition → IR 3 000 € + PS 1 720 € + contrib 1 000 € = 5 720 € d'impôts (taux effectif 57,2 %).",
  },
  AGA_2012_2015: {
    regime: "AGA_2012_2015",
    titre: "AGA — 2012 à août 2015",
    qui: "Attributions entre le 28 septembre 2012 et le 7 août 2015.",
    fiscalite:
      "Imposition au barème (TMI) + PS 9,7 % + contribution salariale 10 %. Pas d'abattement.",
    exemple:
      "10 000 € de gain, TMI 30 % → IR 3 000 € + PS 970 € + contrib 1 000 € = 4 970 € (49,7 %).",
  },
  AGA_2015_2016: {
    regime: "AGA_2015_2016",
    titre: "AGA — Août 2015 à décembre 2016 (loi Macron)",
    qui: "Attributions du 8 août 2015 au 30 décembre 2016.",
    fiscalite:
      "Barème + abattement durée de détention : 50 % entre 2 et 8 ans, 65 % au-delà. PS 17,2 %. Pas de contribution.",
    exemple:
      "10 000 € de gain, TMI 30 %, détention 3 ans → abattement 50 % → IR (10 000 × 50 % × 30 %) = 1 500 € + PS 1 720 € = 3 220 € (32,2 %).",
  },
  AGA_2017: {
    regime: "AGA_2017",
    titre: "AGA — 2017 (seuil 300 k€)",
    qui: "Attributions du 31 décembre 2016 au 31 décembre 2017.",
    fiscalite:
      "Abattement durée de détention sous le seuil de 300 k€ par an. Au-dessus du seuil, imposition au barème plein. PS 17,2 %.",
    exemple:
      "350 000 € de gain : 300 000 € avec abattement, 50 000 € au barème plein. Le seuil est consolidé entre tous les plans AGA_2017 + AGA_POST2018 de l'année.",
  },
  AGA_POST2018: {
    regime: "AGA_POST2018",
    titre: "AGA — Depuis 2018",
    qui: "Régime actuel — attributions à partir du 1er janvier 2018.",
    fiscalite:
      "Abattement fixe de 50 % sous le seuil de 300 k€ (consolidé). Au-dessus, barème plein. PS 17,2 %. Pas de contribution salariale.",
    exemple:
      "10 000 € de gain, TMI 30 % → IR (10 000 × 50 % × 30 %) = 1 500 € + PS 1 720 € = 3 220 € (32,2 %). C'est le régime le plus courant aujourd'hui.",
  },
  NON_QUALIFIE: {
    regime: "NON_QUALIFIE",
    titre: "Plan non qualifié (hors AGA)",
    qui: "Attributions ne respectant pas les conditions du régime AGA français (ex : RSU US d'une société mère étrangère sans accord groupe).",
    fiscalite:
      "Imposition comme du salaire : IR au barème (TMI) + PS 9,7 % + contribution 10 %. Impact direct sur le bulletin de paie.",
    exemple:
      "10 000 € de gain, TMI 30 % → IR 3 000 € + PS 970 € + contrib 1 000 € = 4 970 € (49,7 %). À déclarer comme revenu salarial.",
  },
};

export interface FAQEntry {
  question: string;
  answer: string;
}

export const FAQ: FAQEntry[] = [
  {
    question: "C'est quoi le vesting ?",
    answer:
      "Le vesting est la période pendant laquelle le salarié acquiert progressivement ses actions (ou ses droits). Typiquement 4 ans avec un cliff de 1 an : aucune action n'est acquise les 12 premiers mois, puis 25 % chaque année.",
  },
  {
    question: "Différence entre PFU et barème ?",
    answer:
      "PFU (Prélèvement Forfaitaire Unique) = 30 % flat (12,8 % IR + 17,2 % PS). Barème = imposition au TMI personnel + PS. Le PFU est souvent plus avantageux pour les TMI ≥ 30 %, mais le barème peut l'être pour les TMI plus bas avec abattement.",
  },
  {
    question: "Pourquoi le seuil de 300 k€ ?",
    answer:
      "C'est un plafond fiscal annuel. Sous 300 k€ de gain d'acquisition AGA, le salarié bénéficie d'un abattement (50 % depuis 2018). Au-dessus, le supplément est imposé au barème plein. Le seuil est consolidé : si le salarié a plusieurs plans AGA, on les additionne pour vérifier le dépassement.",
  },
  {
    question: "C'est quoi le TMI ?",
    answer:
      "Tranche Marginale d'Imposition = le taux d'IR appliqué à la tranche supérieure des revenus. En 2026 : 0 %, 11 %, 30 %, 41 %, 45 %. Pour un cadre tech à 80 k€ brut → TMI 30 % typiquement.",
  },
  {
    question: "Qu'est-ce que la PV de cession ?",
    answer:
      "Plus-Value de cession = différence entre le prix de vente et la valeur d'acquisition. Pour les RSU, elle est imposée au PFU systématique (12,8 % + 17,2 %), peu importe le régime du gain d'acquisition.",
  },
  {
    question: "Plan qualifié vs non qualifié ?",
    answer:
      "Un plan AGA français qualifié respecte des conditions strictes (durée de conservation, plafond, accord groupe) et bénéficie d'un régime fiscal favorable. Sinon (souvent les RSU des sociétés US), c'est imposé comme du salaire.",
  },
  {
    question: "C'est quoi MNPI ?",
    answer:
      "Material Non-Public Information = information privilégiée non publique. Un salarié qui détient des MNPI ne peut pas vendre ses actions (fenêtres négatives). Important à mentionner dans toute simulation : la cession n'est pas toujours libre.",
  },
];

export const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Vesting", definition: "Acquisition progressive des actions sur une période (typique : 4 ans)." },
  { term: "Cliff", definition: "Période initiale (souvent 12 mois) sans aucune acquisition. Si le salarié part avant, il perd tout." },
  { term: "Strike price", definition: "Prix d'exercice d'une stock-option ou BSPCE. Plus il est bas, plus le gain potentiel est élevé." },
  { term: "AGA", definition: "Attribution Gratuite d'Actions — régime français d'actions gratuites." },
  { term: "RSU", definition: "Restricted Stock Units — équivalent anglo-saxon, souvent utilisé par les sociétés US." },
  { term: "BSPCE", definition: "Bons de Souscription de Parts de Créateur d'Entreprise — option à prix d'exercice fixe, réservée aux startups FR." },
  { term: "PFU", definition: "Prélèvement Forfaitaire Unique — 30 % flat (12,8 % IR + 17,2 % PS)." },
  { term: "PS", definition: "Prélèvements Sociaux — CSG, CRDS, etc. 17,2 % ou 9,7 % selon le régime." },
  { term: "TMI", definition: "Tranche Marginale d'Imposition — taux d'IR de la dernière tranche de revenus." },
  { term: "MNPI", definition: "Material Non-Public Information — information privilégiée empêchant la vente." },
];

/**
 * System prompt pour l'assistant IA equity (RH).
 * Concatène la doc + le contexte du package en cours.
 */
export function buildEquityCoachSystemPrompt(packageContext?: string): string {
  const regimes = Object.values(REGIME_KNOWLEDGE)
    .map(
      (r) =>
        `### ${r.titre}\n**Concerne :** ${r.qui}\n**Fiscalité :** ${r.fiscalite}\n**Exemple :** ${r.exemple}`,
    )
    .join("\n\n");

  const faqText = FAQ.map((f) => `- **${f.question}** ${f.answer}`).join("\n");
  const glossaire = GLOSSARY.map((g) => `- **${g.term}** : ${g.definition}`).join("\n");

  return `Tu es un assistant equity pour les RH français. Tu aides à comprendre et expliquer la fiscalité des AGA/RSU/BSPCE à des candidats et salariés.

**Ton et style** :
- Pédagogue, clair, concret, exemples chiffrés
- Tu ne fais JAMAIS de conseil financier formel — toujours suggestif
- Tu rappelles que les calculs sont indicatifs (fiscalité évolue, situation perso compte)
- Réponses courtes (5-10 lignes max) sauf si on te demande un développement

**Régimes RSU/AGA français (règles 2026)** :

${regimes}

**FAQ** :
${faqText}

**Glossaire** :
${glossaire}

${packageContext ? `**Contexte du package en cours :**\n${packageContext}\n` : ""}`;
}
