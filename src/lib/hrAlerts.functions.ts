import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ------- Types -------
export type HrAlertType =
  | "high_engagement_negotiation"
  | "inactivity_after_engagement"
  | "sensitive_ai_question"
  | "deadline_approaching";

export type HrAlertSeverity = "high" | "medium" | "low";
export type HrAlertStatus = "unread" | "read" | "dismissed" | "actioned";

export interface HrAlert {
  id: string;
  link_id: string;
  package_id: string | null;
  type: HrAlertType;
  severity: HrAlertSeverity;
  title: string;
  message: string;
  suggestion_message: string | null;
  status: HrAlertStatus;
  created_at: string;
  trigger_data: Record<string, unknown>;
  candidate_name: string | null;
  candidate_email: string | null;
  package_title: string | null;
}

// ------- Trigger keyword lists (sensitive AI questions) -------
const SENSITIVE_KEYWORDS = [
  "salaire", "trop bas", "trop peu", "augment", "négoci", "negoci",
  "concurrent", "autre offre", "autre proposition", "contre-offre", "contre offre",
  "doute", "hésit", "hesit", "peur", "inquiet", "moins bien", "moins favorable",
  "comparé", "compare", "marché", "marche", "fourchette",
];

function detectSensitive(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SENSITIVE_KEYWORDS.filter((k) => lower.includes(k));
}

// ------- AI suggestion generator -------
async function generateSuggestion(opts: {
  candidateName: string | null;
  jobTitle: string | null;
  alertType: HrAlertType;
  context: string;
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const name = opts.candidateName?.trim() || "le candidat";
  const job = opts.jobTitle?.trim() || "ce poste";

  const intent: Record<HrAlertType, string> = {
    high_engagement_negotiation:
      "Le candidat est très engagé et semble en phase de négociation (il a consulté plusieurs fois l'offre et/ou rempli son package actuel). Propose un message court qui ouvre la conversation sur ses attentes, sans pression.",
    inactivity_after_engagement:
      "Le candidat a montré un fort intérêt puis n'a plus donné signe de vie depuis 48h. Rédige un message de relance bienveillant qui ravive l'intérêt et propose un échange.",
    sensitive_ai_question:
      "Le candidat a posé une question sensible à l'assistant IA (salaire, comparaison, doute, contre-offre). Propose un message proactif du RH qui adresse directement la préoccupation et ouvre un échange humain.",
    deadline_approaching:
      "La deadline de décision approche. Rédige un message respectueux qui rappelle l'échéance et propose d'échanger pour lever les derniers doutes.",
  };

  const system = `Tu es un coach RH expert en closing. Tu rédiges des messages courts (3 à 5 phrases max), chaleureux, professionnels, jamais agressifs ni vendeurs. Tu vouvoies. Pas d'emoji. Pas de formules ampoulées.`;

  const user = `Contexte du candidat ${name} pour le poste de ${job} :
${opts.context}

Objectif : ${intent[opts.alertType]}

Rédige UNIQUEMENT le corps du message (pas de "Objet :", pas de "Bonjour [Nom]" générique — commence directement par "Bonjour ${name}," et termine par une signature neutre type "Bien cordialement,"). Maximum 600 caractères.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? "";
    return text.trim().slice(0, 1200) || null;
  } catch {
    return null;
  }
}

// ------- Refresh (detect + persist + suggest) -------
export const refreshHrAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = (context as { userId: string }).userId
      ? await (async () => {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("organization_id")
            .eq("id", (context as { userId: string }).userId)
            .maybeSingle();
          return data?.organization_id as string | undefined;
        })()
      : undefined;

    if (!orgId) return { created: 0 };

    // Load active links for the org
    const { data: links } = await supabaseAdmin
      .from("candidate_links")
      .select(
        "id, package_id, candidate_name, candidate_email, status, engagement_score, candidate_current_package, candidate_current_package_at, opened_at, decision_deadline, expires_at, created_at",
      )
      .eq("organization_id", orgId)
      .in("status", ["pending", "thinking", "simulated"]);

    if (!links?.length) return { created: 0 };

    const linkIds = links.map((l) => l.id);

    // Load related signals
    const [{ data: pkgs }, { data: convs }, { data: events }, { data: existing }] =
      await Promise.all([
        supabaseAdmin
          .from("packages")
          .select("id, title")
          .in("id", links.map((l) => l.package_id).filter(Boolean) as string[]),
        supabaseAdmin
          .from("ai_conversations")
          .select("link_id, question, created_at")
          .in("link_id", linkIds)
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("link_events")
          .select("link_id, created_at")
          .in("link_id", linkIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("hr_alerts")
          .select("link_id, type, status")
          .eq("organization_id", orgId)
          .in("status", ["unread", "read", "dismissed", "actioned"]),
      ]);

    const pkgById = new Map((pkgs ?? []).map((p) => [p.id, p.title]));
    const lastEventByLink = new Map<string, string>();
    for (const e of events ?? []) {
      if (!lastEventByLink.has(e.link_id)) lastEventByLink.set(e.link_id, e.created_at);
    }
    const convsByLink = new Map<string, { question: string; created_at: string }[]>();
    for (const c of convs ?? []) {
      const arr = convsByLink.get(c.link_id) ?? [];
      arr.push({ question: c.question, created_at: c.created_at });
      convsByLink.set(c.link_id, arr);
    }
    // Block re-creating if an active alert already exists (unread/read) OR was recently dismissed/actioned (<7d)
    const blocked = new Set<string>();
    const now = Date.now();
    for (const a of existing ?? []) {
      if (a.status === "unread" || a.status === "read") {
        blocked.add(`${a.link_id}:${a.type}`);
      }
    }

    const toInsert: any[] = [];

    for (const l of links) {
      const candidateName = l.candidate_name ?? null;
      const jobTitle = (l.package_id && pkgById.get(l.package_id)) || null;
      const lastActivity = lastEventByLink.get(l.id) ?? l.opened_at ?? l.created_at;
      const lastActivityMs = lastActivity ? new Date(lastActivity).getTime() : 0;
      const ageH = (now - lastActivityMs) / 3_600_000;
      const expired = l.expires_at && new Date(l.expires_at).getTime() < now;
      if (expired) continue;

      const baseContext = [
        l.engagement_score != null ? `Score d'engagement : ${l.engagement_score}/100` : null,
        l.candidate_current_package
          ? `A renseigné son package actuel (signal de négociation)`
          : null,
        l.decision_deadline
          ? `Deadline de décision : ${new Date(l.decision_deadline).toLocaleString("fr-FR")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      // 1) High engagement / negotiation
      if (
        !blocked.has(`${l.id}:high_engagement_negotiation`) &&
        ((l.engagement_score ?? 0) >= 70 || l.candidate_current_package) &&
        l.status === "pending"
      ) {
        const suggestion = await generateSuggestion({
          candidateName,
          jobTitle,
          alertType: "high_engagement_negotiation",
          context: baseContext || "Candidat très engagé.",
        });
        toInsert.push({
          organization_id: orgId,
          link_id: l.id,
          package_id: l.package_id,
          type: "high_engagement_negotiation",
          severity: "high",
          title: "Candidat en phase de négociation",
          message: l.candidate_current_package
            ? "A rempli son package actuel — signal fort de négociation."
            : `Engagement élevé (${l.engagement_score ?? 0}/100) sans décision.`,
          suggestion_message: suggestion,
          trigger_data: {
            engagement_score: l.engagement_score,
            has_current_package: !!l.candidate_current_package,
          },
        });
      }

      // 2) Inactivity after engagement (>48h)
      if (
        !blocked.has(`${l.id}:inactivity_after_engagement`) &&
        l.opened_at &&
        ageH > 48 &&
        (l.engagement_score ?? 0) >= 40 &&
        l.status === "pending"
      ) {
        const suggestion = await generateSuggestion({
          candidateName,
          jobTitle,
          alertType: "inactivity_after_engagement",
          context: `${baseContext} · Dernière activité il y a ${Math.round(ageH)}h.`,
        });
        toInsert.push({
          organization_id: orgId,
          link_id: l.id,
          package_id: l.package_id,
          type: "inactivity_after_engagement",
          severity: "medium",
          title: "Silence après un fort intérêt",
          message: `Aucune activité depuis ${Math.round(ageH)}h alors que l'engagement était de ${l.engagement_score ?? 0}/100.`,
          suggestion_message: suggestion,
          trigger_data: { hours_inactive: Math.round(ageH) },
        });
      }

      // 3) Sensitive AI question
      const linkConvs = convsByLink.get(l.id) ?? [];
      const sensitiveHits: { question: string; keywords: string[] }[] = [];
      for (const c of linkConvs) {
        const kws = detectSensitive(c.question);
        if (kws.length) sensitiveHits.push({ question: c.question, keywords: kws });
      }
      if (
        sensitiveHits.length &&
        !blocked.has(`${l.id}:sensitive_ai_question`)
      ) {
        const top = sensitiveHits[0];
        const suggestion = await generateSuggestion({
          candidateName,
          jobTitle,
          alertType: "sensitive_ai_question",
          context: `Question posée à l'IA : "${top.question.slice(0, 300)}". Mots-clés sensibles : ${top.keywords.join(", ")}.`,
        });
        toInsert.push({
          organization_id: orgId,
          link_id: l.id,
          package_id: l.package_id,
          type: "sensitive_ai_question",
          severity: "high",
          title: "Question sensible posée à l'IA",
          message: `« ${top.question.slice(0, 140)}${top.question.length > 140 ? "…" : ""} »`,
          suggestion_message: suggestion,
          trigger_data: { keywords: top.keywords, sample: top.question.slice(0, 500) },
        });
      }

      // 4) Deadline approaching (<=48h, >0h)
      if (l.decision_deadline && !blocked.has(`${l.id}:deadline_approaching`)) {
        const hoursToDl =
          (new Date(l.decision_deadline).getTime() - now) / 3_600_000;
        if (hoursToDl > 0 && hoursToDl <= 48 && l.status === "pending") {
          const suggestion = await generateSuggestion({
            candidateName,
            jobTitle,
            alertType: "deadline_approaching",
            context: `Deadline dans ${Math.round(hoursToDl)}h. ${baseContext}`,
          });
          toInsert.push({
            organization_id: orgId,
            link_id: l.id,
            package_id: l.package_id,
            type: "deadline_approaching",
            severity: hoursToDl <= 24 ? "high" : "medium",
            title: hoursToDl <= 24 ? "Deadline imminente (<24h)" : "Deadline proche (<48h)",
            message: `Réponse attendue dans ${Math.round(hoursToDl)}h, sans décision.`,
            suggestion_message: suggestion,
            trigger_data: { hours_to_deadline: Math.round(hoursToDl) },
          });
        }
      }
    }

    if (toInsert.length) {
      await supabaseAdmin.from("hr_alerts").insert(toInsert);
    }

    return { created: toInsert.length };
  });

// ------- List alerts -------
export const listHrAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        includeRead: z.boolean().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<any> => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", (context as { userId: string }).userId)
      .maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) return [];

    const statuses = data.includeRead
      ? ["unread", "read"]
      : ["unread", "read"];

    const { data: alerts } = await supabaseAdmin
      .from("hr_alerts")
      .select(
        "id, link_id, package_id, type, severity, title, message, suggestion_message, status, created_at, trigger_data",
      )
      .eq("organization_id", orgId)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!alerts?.length) return [];

    const linkIds = [...new Set(alerts.map((a) => a.link_id))];
    const pkgIds = [...new Set(alerts.map((a) => a.package_id).filter(Boolean) as string[])];

    const [{ data: links }, { data: pkgs }] = await Promise.all([
      supabaseAdmin
        .from("candidate_links")
        .select("id, candidate_name, candidate_email")
        .in("id", linkIds),
      pkgIds.length
        ? supabaseAdmin.from("packages").select("id, title").in("id", pkgIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

    const linkMap = new Map((links ?? []).map((l) => [l.id, l]));
    const pkgMap = new Map((pkgs ?? []).map((p) => [p.id, p.title]));

    return alerts.map((a) => ({
      ...(a as HrAlert),
      candidate_name: linkMap.get(a.link_id)?.candidate_name ?? null,
      candidate_email: linkMap.get(a.link_id)?.candidate_email ?? null,
      package_title: a.package_id ? pkgMap.get(a.package_id) ?? null : null,
    }));
  });

// ------- Update alert status -------
export const updateHrAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["unread", "read", "dismissed", "actioned"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", (context as { userId: string }).userId)
      .maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) throw new Error("No org");

    const patch: any = { status: data.status };
    if (data.status === "read") patch.read_at = new Date().toISOString();
    if (data.status === "actioned") patch.actioned_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("hr_alerts")
      .update(patch)
      .eq("id", data.id)
      .eq("organization_id", orgId);
    if (error) throw error;
    return { ok: true };
  });

// ------- Mark all read -------
export const markAllAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", (context as { userId: string }).userId)
      .maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) return { ok: true };

    await supabaseAdmin
      .from("hr_alerts")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("status", "unread");

    return { ok: true };
  });
