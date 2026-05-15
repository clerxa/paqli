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
    caller: "importJobPosting",
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

// Detection thresholds for PDF / text extraction
const PDF_MIN_CHARS = 150;
const PDF_MIN_WORDS = 20;

interface PdfExtractionResult {
  text: string;
  charCount: number;
  wordCount: number;
  isLikelyScanned: boolean;
  isInsufficient: boolean;
}

function analyzePdfExtraction(rawText: string): PdfExtractionResult {
  const cleaned = (rawText ?? "").replace(/\s+/g, " ").trim();
  const charCount = cleaned.length;
  const words = cleaned.match(/[a-zA-ZÀ-ÿ]{2,}/g) ?? [];
  const wordCount = words.length;
  const isLikelyScanned = charCount < PDF_MIN_CHARS;
  const isInsufficient =
    charCount < PDF_MIN_CHARS || wordCount < PDF_MIN_WORDS;
  return { text: cleaned, charCount, wordCount, isLikelyScanned, isInsufficient };
}

export type ImportErrorCode =
  | "PDF_SCANNED"
  | "PDF_INSUFFICIENT"
  | "TEXT_INSUFFICIENT"
  | "URL_UNREACHABLE"
  | "URL_TIMEOUT"
  | "EXTRACTION_FAILED"
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE";

export interface ImportErrorAlternative {
  method: "text" | "url" | "file";
  label: string;
  description: string;
}

export interface ImportJobError {
  code: ImportErrorCode;
  message: string;
  alternatives: ImportErrorAlternative[];
  debug?: Record<string, unknown>;
}

export type ImportJobResult =
  | { success: true; data: ImportedJobData }
  | { success: false; error: ImportJobError };

const ALT_TEXT: ImportErrorAlternative = {
  method: "text",
  label: "Coller le texte de l'annonce",
  description:
    "Copiez-collez le contenu depuis votre PDF ouvert dans un lecteur.",
};
const ALT_URL: ImportErrorAlternative = {
  method: "url",
  label: "Importer depuis une URL",
  description:
    "Si l'annonce est publiée en ligne, collez le lien directement.",
};

function fail(error: ImportJobError): ImportJobResult {
  return { success: false, error };
}

export const importJobPostingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ImportJobResult> => {
    let rawText = "";
    let sourceUrl: string | undefined;

    if (data.url) {
      sourceUrl = data.url;
      try {
        rawText = await fetchPageContent(data.url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return fail({
          code: /timeout/i.test(msg) ? "URL_TIMEOUT" : "URL_UNREACHABLE",
          message: msg || "URL inaccessible",
          alternatives: [ALT_TEXT],
        });
      }
    } else if (data.text) {
      const trimmed = data.text.trim();
      const wordCount = (trimmed.match(/[a-zA-ZÀ-ÿ]{2,}/g) ?? []).length;
      if (trimmed.length < PDF_MIN_CHARS || wordCount < PDF_MIN_WORDS) {
        return fail({
          code: "TEXT_INSUFFICIENT",
          message:
            `Le texte collé est trop court (${wordCount} mots détectés). ` +
            "Collez l'intégralité de votre annonce pour une extraction fiable.",
          alternatives: [],
          debug: { charCount: trimmed.length, wordCount },
        });
      }
      rawText = trimmed;
    } else if (data.file) {
      const bin = Uint8Array.from(atob(data.file.base64), (c) =>
        c.charCodeAt(0),
      );
      if (bin.byteLength > 5 * 1024 * 1024) {
        return fail({
          code: "FILE_TOO_LARGE",
          message: "Fichier trop volumineux (max 5 Mo)",
          alternatives: [ALT_TEXT],
        });
      }
      const name = data.file.name.toLowerCase();
      if (name.endsWith(".txt")) {
        rawText = new TextDecoder("utf-8").decode(bin);
      } else if (name.endsWith(".pdf")) {
        let extractedRaw = "";
        try {
          extractedRaw = extractPdfText(bin);
        } catch {
          extractedRaw = "";
        }
        const analysis = analyzePdfExtraction(extractedRaw);
        if (analysis.isInsufficient) {
          const isProbablyScanned = analysis.charCount < 50;
          return fail({
            code: isProbablyScanned ? "PDF_SCANNED" : "PDF_INSUFFICIENT",
            message: isProbablyScanned
              ? "Ce PDF semble être un document scanné (image). " +
                "L'extraction automatique ne fonctionne pas sur les scans. " +
                "Utilisez « Coller le texte » pour importer votre annonce."
              : `Ce PDF contient trop peu de texte exploitable ` +
                `(${analysis.wordCount} mots détectés, minimum requis : ${PDF_MIN_WORDS}). ` +
                "Vérifiez que le fichier n'est pas protégé ou corrompu. " +
                "Utilisez « Coller le texte » comme alternative.",
            alternatives: [ALT_TEXT, ALT_URL],
            debug: {
              charCount: analysis.charCount,
              wordCount: analysis.wordCount,
              fileName: data.file.name,
            },
          });
        }
        rawText = analysis.text;
        console.log(
          `[importJob] PDF extrait OK — ${analysis.charCount} chars, ${analysis.wordCount} mots, fichier: ${data.file.name}`,
        );
      } else if (name.endsWith(".docx")) {
        rawText = extractDocxText(bin);
      } else {
        return fail({
          code: "UNSUPPORTED_FORMAT",
          message: "Format non supporté. Utilisez PDF, Word (.docx) ou TXT.",
          alternatives: [ALT_TEXT],
        });
      }
    }

    if (!rawText || rawText.trim().length < 50) {
      return fail({
        code: "PDF_INSUFFICIENT",
        message: "Contenu insuffisant pour l'analyse",
        alternatives: [ALT_TEXT],
      });
    }

    const truncated = rawText.slice(0, 12000);
    try {
      const extracted = await extractWithClaude(truncated, sourceUrl);
      return { success: true, data: extracted };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return fail({
        code: "EXTRACTION_FAILED",
        message: msg || "L'analyse n'a pas pu extraire les informations.",
        alternatives: [ALT_TEXT],
      });
    }
  });
