import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unzipSync, strFromU8 } from "fflate";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";

export interface ImportedJobData {
  title: string | null;
  contract_type: "cdi" | "cdd" | "freelance" | "alternance" | "stage" | null;
  job_summary: string | null;
  missions: string[];
  stack: string[];
  remote_policy: "full_remote" | "hybrid" | "office_first" | "on_site" | null;
  remote_days: number | null;
  flexible_hours: boolean | null;
  location_city: string | null;
  location_details: string | null;
  team_size: number | null;
  team_description: string | null;
  manager_style: "autonomy" | "coaching" | "structured" | "collaborative" | null;
  company_values: string[];
  culture_note: string | null;
  growth_paths: { horizon: string; path: string }[];
  training_budget: number | null;
  onboarding_note: string | null;
  process_steps: { step: string; duration: string | null }[];
  process_duration: string | null;
  start_date: string | null;
  gross_salary_min: number | null;
  gross_salary_max: number | null;
  variable_target: number | null;
  confidence: { overall: "high" | "medium" | "low"; notes: string };
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr|td|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPageContent(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("URL invalide");
  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254."];
  if (blocked.some((d) => parsed.hostname.includes(d)))
    throw new Error("URL non autorisée");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Paqli/1.0; +https://paqli.lovable.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Page inaccessible (${response.status})`);
  return extractTextFromHtml(await response.text());
}

function extractPdfText(bytes: Uint8Array): string {
  const decoder = new TextDecoder("latin1");
  const content = decoder.decode(bytes);
  const blocks: string[] = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEt.exec(content)) !== null) {
    const strRe = /\(((?:[^()\\]|\\.)*)\)/g;
    let s: RegExpExecArray | null;
    while ((s = strRe.exec(m[1])) !== null) {
      const t = s[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .trim();
      if (t.length > 1) blocks.push(t);
    }
  }
  if (blocks.length === 0)
    throw new Error(
      "PDF non lisible — ce PDF semble être une image scannée. Utilisez la méthode 'Coller le texte'.",
    );
  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function extractDocxText(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  } catch {
    throw new Error("Fichier DOCX invalide");
  }
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("Document Word invalide (document.xml manquant)");
  const text = strFromU8(xml);
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractWithClaude(
  text: string,
  sourceUrl?: string,
): Promise<ImportedJobData> {
  const systemPrompt = `Tu es un expert en analyse d'offres d'emploi.
Tu extrais les informations structurées d'une annonce de recrutement.

RÈGLES ABSOLUES :
- N'invente JAMAIS d'information non présente dans le texte
- Si une information est absente, retourne null pour ce champ
- Pour les salaires : extraire uniquement si explicitement mentionné
- Pour les missions : extraire les missions réelles, pas les reformuler`;

  const userPrompt = `Analyse cette annonce d'emploi et extrait les informations.

SOURCE : ${sourceUrl || "Texte collé directement"}

CONTENU :
${text}

Retourne un JSON avec exactement cette structure (null si l'information est absente) :
{
  "title": "Titre exact du poste",
  "contract_type": "cdi|cdd|freelance|alternance|stage|null",
  "job_summary": "Accroche principale du poste (max 200 chars) ou null",
  "missions": ["Mission 1", "Mission 2"],
  "stack": ["Tech 1", "Tech 2"],
  "remote_policy": "full_remote|hybrid|office_first|on_site|null",
  "remote_days": null,
  "flexible_hours": null,
  "location_city": "Ville exacte ou null",
  "location_details": "Précisions localisation ou null",
  "team_size": null,
  "team_description": "Description équipe ou null",
  "manager_style": "autonomy|coaching|structured|collaborative|null",
  "company_values": ["Valeur 1", "Valeur 2"],
  "culture_note": "Note sur la culture ou null",
  "growth_paths": [{"horizon": "X an(s)", "path": "Description"}],
  "training_budget": null,
  "onboarding_note": "Note onboarding ou null",
  "process_steps": [{"step": "Nom étape", "duration": "Durée ou null"}],
  "process_duration": "Durée totale process ou null",
  "start_date": "Date souhaitée ou null",
  "gross_salary_min": null,
  "gross_salary_max": null,
  "variable_target": null,
  "confidence": {
    "overall": "high|medium|low",
    "notes": "Informations manquantes ou ambiguës"
  }
}`;

  const raw = await callClaude({
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    jsonMode: true,
  });
  try {
    return JSON.parse(raw) as ImportedJobData;
  } catch {
    throw new Error(
      "L'analyse n'a pas pu extraire les informations. Essayez la méthode 'Coller le texte'.",
    );
  }
}

const InputSchema = z
  .object({
    url: z.string().url().optional(),
    text: z.string().min(50).max(50000).optional(),
    file: z
      .object({
        name: z.string().min(1).max(255),
        type: z.string().max(255).optional(),
        base64: z.string().min(1),
      })
      .optional(),
  })
  .refine((v) => v.url || v.text || v.file, {
    message: "url, text ou file requis",
  });

export const importJobPostingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    let rawText = "";
    let sourceUrl: string | undefined;

    if (data.url) {
      sourceUrl = data.url;
      rawText = await fetchPageContent(data.url);
    } else if (data.text) {
      rawText = data.text;
    } else if (data.file) {
      const bin = Uint8Array.from(atob(data.file.base64), (c) =>
        c.charCodeAt(0),
      );
      if (bin.byteLength > 5 * 1024 * 1024)
        throw new Error("Fichier trop volumineux (max 5 Mo)");
      const name = data.file.name.toLowerCase();
      if (name.endsWith(".txt")) {
        rawText = new TextDecoder("utf-8").decode(bin);
      } else if (name.endsWith(".pdf")) {
        rawText = extractPdfText(bin);
      } else if (name.endsWith(".docx")) {
        rawText = extractDocxText(bin);
      } else {
        throw new Error(
          "Format non supporté. Utilisez PDF, Word (.docx) ou TXT.",
        );
      }
    }

    if (!rawText || rawText.trim().length < 50)
      throw new Error("Contenu insuffisant pour l'analyse");

    const truncated = rawText.slice(0, 12000);
    const extracted = await extractWithClaude(truncated, sourceUrl);
    return { data: extracted };
  });
