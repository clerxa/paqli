import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";

const InputSchema = z.object({ linkId: z.string().uuid() });

const SYSTEM_PROMPT = `Tu es un expert en recrutement qui analyse le comportement
des candidats sur une page d'offre d'emploi digitale.

Tu produis une interprétation courte (3-4 phrases) du comportement d'un candidat
à destination d'un recruteur.

RÈGLES :
- Factuel et nuancé — jamais de conclusion définitive
- Utile et actionnable — suggère ce que le RH peut faire
- Bienveillant envers le candidat — pas de jugement de valeur
- Jamais "Ce candidat va accepter/refuser" — seulement des probabilités
- Court — 3 à 4 phrases maximum`;

export const interpretBehaviorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // RLS scopes to current org
    const { data: link, error } = await supabase
      .from("candidate_links")
      .select(
        "id, opened_at, simulated_at, return_visits, time_on_page_total, status, decline_category, engagement_score, engagement_label, intent_prediction",
      )
      .eq("id", data.linkId)
      .maybeSingle();

    if (error || !link) throw new Error("Lien introuvable");

    const [{ data: events }, { data: behaviors }] = await Promise.all([
      supabase
        .from("link_events")
        .select("event_type")
        .eq("link_id", data.linkId),
      supabase
        .from("behavior_events")
        .select("event_type, section, value, duration_s")
        .eq("link_id", data.linkId),
    ]);

    const evs = events ?? [];
    const behs = behaviors ?? [];

    const sectionTimes: Record<string, number> = {};
    behs
      .filter((b) => b.event_type === "section_time" && b.section)
      .forEach((b) => {
        sectionTimes[b.section!] = (sectionTimes[b.section!] ?? 0) + (b.duration_s ?? 0);
      });
    const sectionsMostTime = Object.entries(sectionTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([s]) => s);

    const summary = {
      score: link.engagement_score,
      label: link.engagement_label,
      intent: link.intent_prediction,
      visits: (link.return_visits ?? 0) + (link.opened_at ? 1 : 0),
      time_total_s: link.time_on_page_total,
      simulated: !!link.simulated_at,
      sim_changes: behs.filter((b) => b.event_type === "simulation_change").length,
      scenarios_viewed: behs
        .filter((b) => b.event_type === "scenario_view")
        .map((b) => b.value),
      sections_most_time: sectionsMostTime,
      ai_questions: evs.filter((e) => e.event_type === "question").length,
      messages_sent: evs.filter((e) => e.event_type === "message_candidate").length,
      rdv_click: evs.some((e) => e.event_type === "rdv_click"),
      status: link.status,
      decline_category: link.decline_category,
    };

    const interpretation = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Analyse ce comportement candidat et donne une interprétation utile pour le recruteur :\n\n${JSON.stringify(summary, null, 2)}\n\nQue peut-on déduire de son niveau d'intérêt et de ses préoccupations ? Quelle action le recruteur devrait-il envisager ?`,
      maxTokens: 400,
      caller: "interpretBehavior",
    });

    return { interpretation: interpretation.trim() };
  });
