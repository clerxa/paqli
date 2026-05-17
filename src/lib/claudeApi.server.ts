// Server-only helper for Anthropic Claude API.
// Never import this file from client code.
//
// Resilience:
//  - 25s timeout per attempt via AbortController (Workers cap = 30s)
//  - Up to 3 retries with exponential backoff (1s, 2s, 4s)
//  - Retries on 429/500/503/529 + AbortError + low-level network errors
//  - Honors Anthropic `Retry-After` header on 429
//  - 401 (AUTH_ERROR) and INVALID_RESPONSE never retried
//
// Versionnement des prompts :
//  - `promptName` (ou `caller` par défaut) charge le prompt actif depuis
//    la table `ai_prompts`, avec cache Worker-local (TTL 5 min).
//  - Si la DB est indisponible, fallback sur le `systemPrompt` hardcodé.
//  - Chaque appel est loggé dans `ai_logs` (silencieux, non bloquant).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5";

const CONFIG = {
  timeoutMs: 25_000,
  maxRetries: 3,
  retryDelaysMs: [1_000, 2_000, 4_000],
  retryableStatusCodes: [429, 500, 503, 529],
} as const;

interface CallOptions {
  /** Hardcoded system prompt — used as fallback if DB load fails. */
  systemPrompt: string;
  /**
   * Prompt name to load from `ai_prompts` (active version).
   * Defaults to `caller` when omitted (they are kept aligned by convention).
   */
  promptName?: string;
  userPrompt: string;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  /** Identifier used in logs, e.g. 'scoreAttractiveness'. */
  caller?: string;
  /** Organization that triggered the call — for ai_logs attribution. */
  organizationId?: string;
}

export interface ClaudeCallResult {
  text: string;
  retries: number;
  durationMs: number;
}

export type ClaudeErrorCode =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "OVERLOADED"
  | "AUTH_ERROR"
  | "NETWORK_ERROR"
  | "MAX_RETRIES_EXCEEDED"
  | "INVALID_RESPONSE";

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly code: ClaudeErrorCode,
    public readonly statusCode?: number,
    public readonly retries?: number,
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────
// Prompt loading (Worker-local cache, TTL 5 min)
// ─────────────────────────────────────────────────────────────
const PROMPT_CACHE_TTL = 5 * 60 * 1000;
const promptCache = new Map<
  string,
  { systemPrompt: string; version: string; cachedAt: number }
>();

export async function loadActivePrompt(
  name: string,
): Promise<{ systemPrompt: string; version: string } | null> {
  const now = Date.now();
  const cached = promptCache.get(name);
  if (cached && now - cached.cachedAt < PROMPT_CACHE_TTL) {
    return { systemPrompt: cached.systemPrompt, version: cached.version };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_prompts")
      .select("system_prompt, version")
      .eq("name", name)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      console.warn(
        `[claudeApi] Aucun prompt actif trouvé pour "${name}" — fallback hardcodé`,
      );
      return null;
    }

    promptCache.set(name, {
      systemPrompt: data.system_prompt,
      version: data.version,
      cachedAt: now,
    });
    return { systemPrompt: data.system_prompt, version: data.version };
  } catch (e) {
    console.warn(`[claudeApi] loadActivePrompt("${name}") a échoué:`, e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// AI call logging (fire-and-forget, never blocks the main call)
// ─────────────────────────────────────────────────────────────
export async function logAiCall(params: {
  promptName: string;
  promptVersion: string;
  model: string;
  durationMs: number;
  retries: number;
  success: boolean;
  errorCode?: string;
  organizationId?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("ai_logs").insert({
      prompt_name: params.promptName,
      prompt_version: params.promptVersion,
      model: params.model,
      duration_ms: params.durationMs,
      retries: params.retries,
      success: params.success,
      error_code: params.errorCode ?? null,
      organization_id: params.organizationId ?? null,
    });
  } catch (logError) {
    console.warn("[claudeApi] Erreur de logging (ignorée):", logError);
  }
}

export async function callClaude(options: CallOptions): Promise<string> {
  const result = await callClaudeWithMetadata(options);
  return result.text;
}

export async function callClaudeWithMetadata(
  options: CallOptions,
): Promise<ClaudeCallResult> {
  const {
    systemPrompt: hardcodedSystemPrompt,
    userPrompt,
    maxTokens = 1000,
    jsonMode = false,
    model = DEFAULT_MODEL,
    caller = "unknown",
    organizationId,
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeError("ANTHROPIC_API_KEY missing", "AUTH_ERROR", 401, 0);
  }

  // Résolution du prompt système : DB d'abord, fallback hardcodé.
  // `promptName` explicite > `caller` (convention : caller === promptName).
  const promptName =
    options.promptName ?? (caller !== "unknown" ? caller : undefined);

  let resolvedSystemPrompt = hardcodedSystemPrompt;
  let resolvedVersion = "hardcoded";

  if (promptName) {
    const loaded = await loadActivePrompt(promptName);
    if (loaded) {
      resolvedSystemPrompt = loaded.systemPrompt;
      resolvedVersion = loaded.version;
    } else {
      resolvedVersion = "hardcoded-fallback";
    }
  }

  const system = jsonMode
    ? `${resolvedSystemPrompt}\n\nRéponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks.`
    : resolvedSystemPrompt;

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const startTime = Date.now();
  let lastError: ClaudeError | null = null;
  let retries = 0;

  const logFailure = (code: string) => {
    if (!promptName) return;
    void logAiCall({
      promptName,
      promptVersion: resolvedVersion,
      model,
      durationMs: Date.now() - startTime,
      retries,
      success: false,
      errorCode: code,
      organizationId,
    });
  };

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = CONFIG.retryDelaysMs[attempt - 1] ?? 4_000;
      console.warn(
        `[claudeApi] ${caller} — retry ${attempt}/${CONFIG.maxRetries} ` +
          `après ${delayMs}ms (dernière erreur: ${lastError?.code})`,
      );
      await sleep(delayMs);
      retries++;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

      let response: Response;
      try {
        response = await fetch(CLAUDE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Auth error — never retry
      if (response.status === 401) {
        logFailure("AUTH_ERROR");
        throw new ClaudeError(
          "Clé API Anthropic invalide ou manquante.",
          "AUTH_ERROR",
          401,
          retries,
        );
      }

      // Transient — retry
      if (
        (CONFIG.retryableStatusCodes as readonly number[]).includes(
          response.status,
        )
      ) {
        const errorBody = await response.text().catch(() => "");
        lastError = new ClaudeError(
          `Anthropic a retourné ${response.status}. ${errorBody.slice(0, 200)}`,
          response.status === 429
            ? "RATE_LIMITED"
            : response.status === 529
              ? "OVERLOADED"
              : "NETWORK_ERROR",
          response.status,
          retries,
        );

        const retryAfter = response.headers.get("retry-after");
        if (retryAfter && attempt < CONFIG.maxRetries) {
          const parsed = parseInt(retryAfter, 10);
          if (!Number.isNaN(parsed)) {
            const waitMs = Math.min(parsed * 1000, 10_000);
            console.warn(
              `[claudeApi] ${caller} — Retry-After: ${retryAfter}s, attente ${waitMs}ms`,
            );
            await sleep(waitMs);
          }
        }
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new ClaudeError(
          `Anthropic erreur inattendue ${response.status}: ${errorBody.slice(0, 300)}`,
          "NETWORK_ERROR",
          response.status,
          retries,
        );
      }

      const data = (await response.json()) as {
        content?: { text?: string }[];
      };
      const rawText = data.content?.[0]?.text;

      if (!rawText || typeof rawText !== "string") {
        throw new ClaudeError(
          "Réponse Anthropic vide ou malformée.",
          "INVALID_RESPONSE",
          response.status,
          retries,
        );
      }

      const text = jsonMode
        ? rawText.replace(/```json|```/g, "").trim()
        : rawText.trim();

      const durationMs = Date.now() - startTime;
      if (retries > 0) {
        console.log(
          `[claudeApi] ${caller} — succès après ${retries} retries, ` +
            `${durationMs}ms, ${text.length} chars`,
        );
      }

      // Log succès (fire-and-forget)
      if (promptName) {
        void logAiCall({
          promptName,
          promptVersion: resolvedVersion,
          model,
          durationMs,
          retries,
          success: true,
          organizationId,
        });
      }

      return { text, retries, durationMs };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new ClaudeError(
          `Timeout Anthropic après ${CONFIG.timeoutMs}ms (${caller})`,
          "TIMEOUT",
          undefined,
          retries,
        );
        console.error(
          `[claudeApi] ${caller} — TIMEOUT après ${CONFIG.timeoutMs}ms`,
        );
        if (attempt < CONFIG.maxRetries) continue;
        logFailure("TIMEOUT");
        throw lastError;
      }

      if (error instanceof ClaudeError) {
        if (error.code === "AUTH_ERROR" || error.code === "INVALID_RESPONSE") {
          logFailure(error.code);
          throw error;
        }
        lastError = error;
        if (attempt < CONFIG.maxRetries) continue;
        logFailure("MAX_RETRIES_EXCEEDED");
        throw new ClaudeError(
          `${error.message} (après ${retries} retries)`,
          "MAX_RETRIES_EXCEEDED",
          error.statusCode,
          retries,
        );
      }

      const networkError = new ClaudeError(
        `Erreur réseau vers Anthropic: ${(error as Error).message}`,
        "NETWORK_ERROR",
        undefined,
        retries,
      );
      lastError = networkError;
      if (attempt < CONFIG.maxRetries) continue;
      logFailure("NETWORK_ERROR");
      throw networkError;
    }
  }

  logFailure("MAX_RETRIES_EXCEEDED");
  throw (
    lastError ??
    new ClaudeError(
      "Nombre maximum de retries dépassé.",
      "MAX_RETRIES_EXCEEDED",
      undefined,
      retries,
    )
  );
}
