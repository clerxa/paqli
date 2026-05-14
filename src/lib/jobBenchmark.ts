// Heuristique légère : déduit job_family + seniority depuis le titre du poste.

export type JobFamily =
  | "software_engineer"
  | "frontend_engineer"
  | "backend_engineer"
  | "data_scientist"
  | "data_engineer"
  | "product_manager"
  | "designer"
  | "devops_engineer"
  | "engineering_manager"
  | "sales"
  | "marketing"
  | "other";

export type Seniority = "junior" | "mid" | "senior" | "staff" | "lead";

const FAMILY_RULES: Array<{ family: JobFamily; rx: RegExp }> = [
  { family: "engineering_manager", rx: /(engineering manager|em|tech lead manager|head of engineering|cto)/i },
  { family: "frontend_engineer", rx: /(front[- ]?end|frontend|react|vue|angular)/i },
  { family: "backend_engineer", rx: /(back[- ]?end|backend|api|node|python|java|go(lang)?|rust|ruby|php)/i },
  { family: "devops_engineer", rx: /(devops|sre|platform engineer|infra engineer|cloud engineer)/i },
  { family: "data_engineer", rx: /(data engineer|analytics engineer|etl)/i },
  { family: "data_scientist", rx: /(data scientist|machine learning|ml engineer|ai engineer)/i },
  { family: "designer", rx: /(designer|ux|ui|product design)/i },
  { family: "product_manager", rx: /(product manager|pm|product owner|po|head of product|cpo)/i },
  { family: "sales", rx: /(sales|account exec|ae|bdr|sdr|business developer|cco)/i },
  { family: "marketing", rx: /(marketing|growth|seo|content|cmo)/i },
  { family: "software_engineer", rx: /(software engineer|swe|developer|développeur|developpeur|engineer|ingénieur logiciel)/i },
];

const SENIORITY_RULES: Array<{ seniority: Seniority; rx: RegExp }> = [
  { seniority: "staff", rx: /\b(staff|principal)\b/i },
  { seniority: "lead", rx: /\b(lead|head|director|vp|chief)\b/i },
  { seniority: "senior", rx: /\b(senior|sr\.?|confirm[ée]|expérimenté|experimente)\b/i },
  { seniority: "junior", rx: /\b(junior|jr\.?|débutant|debutant|graduate|stagiaire|alternant)\b/i },
];

export function inferJobFamily(title: string): JobFamily {
  if (!title) return "other";
  for (const r of FAMILY_RULES) if (r.rx.test(title)) return r.family;
  return "other";
}

export function inferSeniority(title: string): Seniority {
  if (!title) return "mid";
  for (const r of SENIORITY_RULES) if (r.rx.test(title)) return r.seniority;
  return "mid";
}
