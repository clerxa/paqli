// Catalogue complet des avantages avec valeurs de référence marché 2026
// Logique : "Ce que vous ne paierez pas" — chaque avantage est traduit en €

export type BenefitCategory =
  | "health"
  | "sport"
  | "mental"
  | "mobility"
  | "food"
  | "training"
  | "family"
  | "equipment"
  | "financial_extra";

export type ValueType = "fixed" | "estimated" | "qualitative";

export type BenefitInputType = "amount" | "toggle" | "select" | "slider";

export interface BenefitDefinition {
  key: string;
  label: string;
  category: BenefitCategory;
  valueType: ValueType;
  icon: string;
  description: string;
  defaultMonthlyValue?: number;
  defaultAnnualValue?: number;
  inputType: BenefitInputType;
  unit?: string;
  hint?: string;
}

export interface PackageBenefit {
  benefit_key: string;
  category: BenefitCategory;
  value_type: ValueType;
  monthly_value?: number | null;
  annual_value?: number | null;
  employer_share?: number | null;
  custom_label?: string | null;
  custom_note?: string | null;
  display_order?: number;
}

export const BENEFIT_CATALOG: BenefitDefinition[] = [
  // ── SANTÉ & PRÉVOYANCE ─────────────────────────────────────
  {
    key: "mutuelle",
    label: "Mutuelle complémentaire santé",
    category: "health",
    valueType: "fixed",
    icon: "🏥",
    description:
      "Part patronale de la mutuelle — vous économisez ce montant sur votre couverture santé.",
    inputType: "amount",
    unit: "€/mois",
    hint:
      "Saisissez uniquement la part prise en charge par l'entreprise (obligatoire ≥ 50%).",
  },
  {
    key: "mutuelle_premium",
    label: "Mutuelle premium (dentaire / vision renforcée)",
    category: "health",
    valueType: "fixed",
    icon: "🦷",
    description:
      "Couverture dentaire et optique renforcée — réduit significativement vos restes à charge.",
    inputType: "toggle",
    defaultMonthlyValue: 25,
    hint: "Valeur estimée : ~25€/mois de couverture supplémentaire.",
  },
  {
    key: "prevoyance",
    label: "Prévoyance (incapacité / invalidité)",
    category: "health",
    valueType: "fixed",
    icon: "🛡️",
    description:
      "Maintien de salaire en cas d'arrêt — protection financière non incluse dans la mutuelle de base.",
    inputType: "amount",
    unit: "€/mois",
    hint: "Part patronale uniquement.",
  },

  // ── SPORT & BIEN-ÊTRE PHYSIQUE ─────────────────────────────
  {
    key: "gymlib",
    label: "GymLib / Gympass",
    category: "sport",
    valueType: "estimated",
    icon: "🏋️",
    description:
      "Accès illimité à un réseau de salles de sport — vous économisez votre abonnement mensuel.",
    inputType: "select",
    hint: "Choisissez le niveau d'accès inclus.",
  },
  {
    key: "sport_onsite",
    label: "Salle de sport sur site",
    category: "sport",
    valueType: "estimated",
    icon: "🏃",
    description:
      "Salle de sport dans les locaux — économie d'un abonnement classique (~40€/mois).",
    inputType: "toggle",
    defaultMonthlyValue: 40,
    defaultAnnualValue: 480,
  },
  {
    key: "velo_electrique",
    label: "Vélo de fonction / forfait mobilité",
    category: "sport",
    valueType: "fixed",
    icon: "🚲",
    description:
      "Forfait mobilité durable ou vélo de fonction — économie sur vos déplacements domicile-travail.",
    inputType: "amount",
    unit: "€/mois",
    hint: "Plafond légal exonéré : 700€/an en 2026.",
  },

  // ── SANTÉ MENTALE & BIEN-ÊTRE ──────────────────────────────
  {
    key: "moka_care",
    label: "Moka.care / Alan Mind / programme bien-être mental",
    category: "mental",
    valueType: "estimated",
    icon: "🧠",
    description:
      "Accès à un programme de soutien psychologique — économie sur des séances de thérapie (~60-80€/séance).",
    inputType: "toggle",
    defaultMonthlyValue: 50,
    defaultAnnualValue: 600,
    hint: "Valeur estimée basée sur 1 séance/mois remplacée.",
  },
  {
    key: "psy_sessions",
    label: "Séances de psychologie remboursées",
    category: "mental",
    valueType: "fixed",
    icon: "💬",
    description:
      "Remboursement de séances chez un psychologue — réduit directement votre reste à charge.",
    inputType: "amount",
    unit: "séances/an",
    hint: "Nombre de séances remboursées annuellement (valeur ~70€/séance).",
  },
  {
    key: "meditation_app",
    label: "Application méditation / mindfulness (Headspace, Calm…)",
    category: "mental",
    valueType: "estimated",
    icon: "🧘",
    description: "Abonnement application bien-être mental offert.",
    inputType: "toggle",
    defaultAnnualValue: 80,
  },

  // ── MOBILITÉ & TRANSPORT ───────────────────────────────────
  {
    key: "navigo_100",
    label: "Remboursement transport 100% (vs 50% légal)",
    category: "mobility",
    valueType: "fixed",
    icon: "🚇",
    description:
      "Remboursement intégral de votre titre de transport — vous économisez la moitié non-obligatoire.",
    inputType: "toggle",
    defaultAnnualValue: 508,
    hint:
      "Navigo annuel 2026 : ~1 016€. Légal : 50% = 508€. Vous économisez 508€ supplémentaires.",
  },
  {
    key: "forfait_mobilite",
    label: "Forfait mobilité durable (trottinette, vélo, covoiturage)",
    category: "mobility",
    valueType: "fixed",
    icon: "🛴",
    description:
      "Prise en charge des mobilités douces domicile-travail — exonéré de charges.",
    inputType: "amount",
    unit: "€/mois",
    hint: "Plafond légal exonéré : 700€/an. Cumulable avec navigo sous conditions.",
  },
  {
    key: "parking",
    label: "Place de parking",
    category: "mobility",
    valueType: "estimated",
    icon: "🅿️",
    description:
      "Place de parking mise à disposition — économie sur un abonnement parking Paris/IDF.",
    inputType: "toggle",
    defaultMonthlyValue: 150,
    defaultAnnualValue: 1800,
    hint: "Valeur estimée selon localisation (Paris : ~150-250€/mois).",
  },
  {
    key: "voiture_fonction",
    label: "Voiture de fonction",
    category: "mobility",
    valueType: "estimated",
    icon: "🚗",
    description:
      "Véhicule de fonction mis à disposition — valeur avantage en nature estimée.",
    inputType: "amount",
    unit: "€/mois",
    hint:
      "Saisissez la valeur de l'avantage en nature (généralement 150-400€/mois).",
  },

  // ── ALIMENTATION ───────────────────────────────────────────
  {
    key: "tickets_restaurant",
    label: "Tickets restaurant",
    category: "food",
    valueType: "fixed",
    icon: "🍽️",
    description:
      "Titre-repas pris en charge à 60% — valeur nette annuelle sur la base de 218 jours travaillés.",
    inputType: "amount",
    unit: "€ valeur faciale",
    hint:
      "Ex: TR à 10€ (60% patronal = 6€) × 218j = 1 308€/an nets. Exonéré de charges sous plafond 2026.",
  },
  {
    key: "cantine_subventionnee",
    label: "Cantine / restaurant d'entreprise subventionné",
    category: "food",
    valueType: "estimated",
    icon: "🏛️",
    description:
      "Repas subventionné au restaurant d'entreprise — économie sur votre budget repas quotidien.",
    inputType: "amount",
    unit: "€/repas économisé",
    hint:
      "Ex: repas à 4€ vs 12€ en restauration classique = 8€/jour × 218j = 1 744€/an.",
  },
  {
    key: "panier_repas",
    label: "Plateau / paniers repas livrés",
    category: "food",
    valueType: "estimated",
    icon: "🥗",
    description:
      "Repas livrés ou plateaux mis à disposition — économie sur votre alimentation au bureau.",
    inputType: "toggle",
    defaultAnnualValue: 600,
  },

  // ── FORMATION & DÉVELOPPEMENT ──────────────────────────────
  {
    key: "budget_formation",
    label: "Budget formation annuel",
    category: "training",
    valueType: "fixed",
    icon: "📚",
    description:
      "Budget dédié à votre développement professionnel — vous choisissez comment l'investir.",
    inputType: "amount",
    unit: "€/an",
    hint: "Conférences, formations en ligne, certifications, livres techniques.",
  },
  {
    key: "coursera_udemy",
    label: "Accès plateforme e-learning (Coursera, Udemy, O'Reilly…)",
    category: "training",
    valueType: "estimated",
    icon: "💻",
    description:
      "Accès illimité à une plateforme de formation en ligne — valeur d'un abonnement premium.",
    inputType: "toggle",
    defaultAnnualValue: 400,
    hint: "Valeur estimée : ~400€/an pour un abonnement individuel.",
  },
  {
    key: "conferences",
    label: "Conférences & événements tech pris en charge",
    category: "training",
    valueType: "fixed",
    icon: "🎤",
    description:
      "Budget conférences annuelles — vous développez votre réseau aux frais de l'entreprise.",
    inputType: "amount",
    unit: "€/an",
  },

  // ── FAMILLE & PARENTALITÉ ──────────────────────────────────
  {
    key: "creche_cesu",
    label: "Crèche d'entreprise / CESU garde d'enfants",
    category: "family",
    valueType: "fixed",
    icon: "👶",
    description:
      "Aide à la garde d'enfants — économie directe sur votre budget familial.",
    inputType: "amount",
    unit: "€/mois",
    hint: "CESU exonéré de charges et d'IR dans la limite légale.",
  },
  {
    key: "conge_parental_etendu",
    label: "Congé parental étendu (au-delà du légal)",
    category: "family",
    valueType: "qualitative",
    icon: "👨‍👩‍👧",
    description:
      "Congé parental supérieur aux obligations légales — signal fort sur l'équilibre vie pro/perso.",
    inputType: "toggle",
    hint: "Précisez le nombre de semaines supplémentaires offertes.",
  },
  {
    key: "teletravail_garanti",
    label: "Télétravail garanti au contrat",
    category: "family",
    valueType: "estimated",
    icon: "🏠",
    description:
      "Le télétravail est formalisé dans le contrat — économie sur vos frais de déplacement et gain de temps.",
    inputType: "toggle",
    defaultAnnualValue: 0,
    hint:
      "Valeur qualitative forte. Économie transport estimée automatiquement selon les jours remote.",
  },

  // ── ÉQUIPEMENT & TECH ──────────────────────────────────────
  {
    key: "macbook",
    label: "MacBook Pro / PC haut de gamme",
    category: "equipment",
    valueType: "estimated",
    icon: "💻",
    description:
      "Matériel professionnel mis à disposition — vous travaillez sur les meilleurs outils sans les acheter.",
    inputType: "toggle",
    defaultMonthlyValue: 70,
    defaultAnnualValue: 840,
    hint: "Valeur estimée : MacBook Pro 14\" ~2 500€ amorti sur 3 ans = ~70€/mois.",
  },
  {
    key: "budget_home_office",
    label: "Budget home office",
    category: "equipment",
    valueType: "fixed",
    icon: "🖥️",
    description:
      "Budget pour équiper votre bureau à domicile — chaise ergonomique, écran, accessoires.",
    inputType: "amount",
    unit: "€ one-time",
    hint:
      "Certaines entreprises offrent 500-2 000€ pour l'équipement initial.",
  },
  {
    key: "telephone_pro",
    label: "Téléphone professionnel",
    category: "equipment",
    valueType: "estimated",
    icon: "📱",
    description:
      "Smartphone mis à disposition — économie sur votre forfait et matériel personnel.",
    inputType: "toggle",
    defaultAnnualValue: 300,
    hint: "Valeur estimée : iPhone 15 amorti sur 3 ans + forfait = ~25€/mois.",
  },

  // ── FINANCIER ADDITIONNEL ──────────────────────────────────
  {
    key: "perco",
    label: "PERCO / PER Collectif",
    category: "financial_extra",
    valueType: "fixed",
    icon: "🏦",
    description:
      "Plan d'épargne retraite collectif — l'entreprise abonde votre épargne retraite.",
    inputType: "amount",
    unit: "€/an abondement max",
    hint: "Plafond légal 2026 : 16% du PASS = 7 536€/an.",
  },
  {
    key: "prime_cooptation",
    label: "Prime de cooptation",
    category: "financial_extra",
    valueType: "fixed",
    icon: "🤝",
    description:
      "Prime versée si vous recommandez un candidat recruté — revenu additionnel potentiel.",
    inputType: "amount",
    unit: "€/cooptation",
  },
  {
    key: "stock_options_extra",
    label: "Plan d'actionnariat salarié (PASE / FCPE)",
    category: "financial_extra",
    valueType: "fixed",
    icon: "📈",
    description:
      "Actionnariat salarié avec décote ou abondement — investissement boosté par l'employeur.",
    inputType: "amount",
    unit: "€/an abondement",
  },
];

export const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  health: "🏥 Santé & prévoyance",
  sport: "🏋️ Sport & bien-être",
  mental: "🧠 Santé mentale",
  mobility: "🚇 Mobilité",
  food: "🍽️ Alimentation",
  training: "📚 Formation",
  family: "👶 Famille",
  equipment: "💻 Équipement",
  // financial_extra retiré du configurateur — couvert par les étapes Equity et Épargne salariale
  financial_extra: "💰 Financier+",
};

// Catégories visibles dans l'étape "Avantages" du configurateur
export const VISIBLE_CATEGORIES: BenefitCategory[] = [
  "health",
  "sport",
  "mental",
  "mobility",
  "food",
  "training",
  "family",
  "equipment",
];

export function getBenefitDef(key: string): BenefitDefinition | undefined {
  return BENEFIT_CATALOG.find((b) => b.key === key);
}

export const GYMLIB_LEVELS = [
  { value: "access", label: "Access (salles de base)", monthly: 25 },
  { value: "standard", label: "Standard (+ cours collectifs)", monthly: 40 },
  { value: "plus", label: "Plus (premium, piscines)", monthly: 60 },
  { value: "unlimited", label: "Unlimited (tout accès)", monthly: 80 },
];

export function estimateBenefitValue(benefit: PackageBenefit): number {
  if (benefit.annual_value && benefit.annual_value > 0)
    return Number(benefit.annual_value);
  if (benefit.monthly_value && benefit.monthly_value > 0) {
    // Tickets restaurant : valeur faciale × 60% × 218j
    if (benefit.benefit_key === "tickets_restaurant")
      return Math.round(Number(benefit.monthly_value) * 218 * 0.6);
    // Cantine : € économisé par repas × 218j
    if (benefit.benefit_key === "cantine_subventionnee")
      return Math.round(Number(benefit.monthly_value) * 218);
    // Psy : nb séances × 70€
    if (benefit.benefit_key === "psy_sessions")
      return Math.round(Number(benefit.monthly_value) * 70);
    return Math.round(Number(benefit.monthly_value) * 12);
  }
  const def = getBenefitDef(benefit.benefit_key);
  if (!def) return 0;
  if (def.defaultAnnualValue) return def.defaultAnnualValue;
  if (def.defaultMonthlyValue) return def.defaultMonthlyValue * 12;
  return 0;
}

export function calcBenefitsTotal(benefits: PackageBenefit[]): number {
  return benefits
    .filter((b) => {
      const def = getBenefitDef(b.benefit_key);
      if (def) return def.valueType !== "qualitative";
      // Avantage personnalisé (pas dans le catalogue) : on s'appuie sur value_type
      return b.value_type !== "qualitative";
    })
    .reduce((sum, b) => sum + estimateBenefitValue(b), 0);
}

export function buildSavingsMessage(
  benefitKey: string,
  annualValue: number,
): string {
  if (annualValue <= 0) return "";
  const monthly = Math.round(annualValue / 12);
  const messages: Partial<Record<string, string>> = {
    gymlib: `Vous économisez ~${monthly}€/mois sur votre abonnement salle de sport`,
    sport_onsite: `Équivaut à un abonnement salle offert (~${monthly}€/mois)`,
    tickets_restaurant: `Représente ~${monthly}€/mois de pouvoir d'achat supplémentaire`,
    navigo_100: `${annualValue}€/an que vous gardez dans votre poche vs 50% légal`,
    moka_care: `Accès à un soutien psychologique valorisé ~${monthly}€/mois`,
    budget_formation: `${annualValue}€/an pour investir dans vos compétences`,
    mutuelle: `${monthly}€/mois de cotisation prise en charge par l'entreprise`,
    parking: `Économie ~${monthly}€/mois sur un abonnement parking`,
    macbook: `Matériel pro valorisé ~${monthly}€/mois`,
    telephone_pro: `Forfait + matériel valorisé ~${monthly}€/mois`,
  };
  return (
    messages[benefitKey] ??
    `Représente ~${monthly}€/mois de valeur que vous n'avancez pas`
  );
}
