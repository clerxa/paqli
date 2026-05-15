import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";

const MAX_BYTES_PER_URL = 60_000;
const MAX_URLS = 8;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function scrapeUrl(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PaqliBot/1.0; +https://paqli.fr)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, MAX_BYTES_PER_URL);
  } catch {
    return "";
  }
}

const InputSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .max(MAX_URLS),
});

export interface GeneratedCompanyProfile {
  description: string;
  key_figures: { label: string; value: string }[];
  values: string[];
  culture_note: string;
  links: { label: string; url: string; type?: string | null }[];
}

export const generateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedCompanyProfile> => {
    const scraped = await Promise.all(
      data.urls.map(async (u) => {
        const txt = await scrapeUrl(u);
        return { url: u, text: txt };
      }),
    );

    const corpus = scraped
      .filter((s) => s.text.length > 200)
      .map((s) => `===== Source: ${s.url} =====\n${s.text}`)
      .join("\n\n")
      .slice(0, 180_000);

    if (!corpus) {
      throw new Error(
        "Impossible de récupérer du contenu depuis ces URLs. Vérifiez qu'elles sont publiques et accessibles.",
      );
    }

    const systemPrompt = `Tu es un expert en marque employeur et copywriting RH.
À partir de pages publiques d'une entreprise, tu rédiges un profil entreprise
factuel, attractif et structuré.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en JSON valide
- Ne jamais inventer un chiffre, un nom de client ou une levée de fonds
- Si une information n'est pas trouvée, ne pas l'inclure
- Ton humain, factuel, direct — pas corporate ni superlatifs
- Français uniquement`;

    const userPrompt = `Analyse les contenus ci-dessous (extraits de site web,
LinkedIn, presse, etc.) et produis un profil entreprise.

CONTENU SOURCE :
${corpus}

Réponds en JSON strictement avec cette structure :
{
  "description": "<pitch + produit + marché en 3-5 phrases, max 600 chars>",
  "key_figures": [
    {"label": "<ex: Effectif>", "value": "<ex: 45 personnes>"},
    {"label": "<ex: Création>", "value": "<ex: 2021>"},
    {"label": "<ex: Levée totale>", "value": "<ex: 12 M€>"}
  ],
  "values": ["<valeur courte 1>", "<valeur courte 2>"],
  "culture_note": "<1-2 phrases sur l'ambiance / le manifeste, max 300 chars>",
  "links": [
    {"label": "Site", "url": "https://...", "type": "website"},
    {"label": "LinkedIn", "url": "https://...", "type": "linkedin"}
  ]
}

- key_figures : 3 à 6 entrées maximum, uniquement si trouvées
- values : 3 à 8 valeurs maximum, mots ou expressions courtes
- links : uniquement les liens trouvés dans le contenu source`;

    const raw = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as GeneratedCompanyProfile;
    return {
      description: typeof parsed.description === "string" ? parsed.description : "",
      key_figures: Array.isArray(parsed.key_figures)
        ? parsed.key_figures
            .filter((k) => k && typeof k.label === "string" && typeof k.value === "string")
            .slice(0, 8)
        : [],
      values: Array.isArray(parsed.values)
        ? parsed.values.filter((v) => typeof v === "string" && v.trim()).slice(0, 12)
        : [],
      culture_note:
        typeof parsed.culture_note === "string" ? parsed.culture_note : "",
      links: Array.isArray(parsed.links)
        ? parsed.links
            .filter((l) => l && typeof l.url === "string" && /^https?:\/\//.test(l.url))
            .map((l) => ({
              label: typeof l.label === "string" ? l.label : l.url,
              url: l.url,
              type: typeof l.type === "string" ? l.type : null,
            }))
            .slice(0, 12)
        : [],
    };
  });
