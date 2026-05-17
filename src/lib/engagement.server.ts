// Server-only helper to compute engagement score for a candidate link.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface EngagementResult {
  score: number;
  label: "cold" | "lukewarm" | "warm" | "hot";
  intent:
    | "likely_accept"
    | "uncertain"
    | "likely_decline"
    | "unknown"
    | "accepted"
    | "declined";
}

export async function computeEngagement(linkId: string): Promise<EngagementResult | null> {
  const [linkRes, eventsRes, behaviorRes] = await Promise.all([
    supabaseAdmin
      .from("candidate_links")
      .select(
        "id, opened_at, simulated_at, return_visits, time_on_page_total, status, decline_category",
      )
      .eq("id", linkId)
      .maybeSingle(),
    supabaseAdmin
      .from("link_events")
      .select("event_type")
      .eq("link_id", linkId),
    supabaseAdmin
      .from("behavior_events")
      .select("event_type, section, value, duration_s")
      .eq("link_id", linkId),
  ]);

  const link = linkRes.data;
  if (!link) return null;
  const events = eventsRes.data ?? [];
  const behaviors = behaviorRes.data ?? [];

  let score = 0;

  if (link.opened_at) score += 15;

  const returns = link.return_visits ?? 0;
  if (returns >= 1) score += 10;
  if (returns >= 2) score += 10;

  const totalTime = link.time_on_page_total ?? 0;
  if (totalTime >= 120) score += 5;
  if (totalTime >= 300) score += 10;
  if (totalTime >= 600) score += 10;

  if (link.simulated_at) score += 15;

  const simChanges = behaviors.filter((b) => b.event_type === "simulation_change").length;
  if (simChanges >= 2) score += 5;
  if (simChanges >= 4) score += 5;

  const scenariosViewed = behaviors
    .filter((b) => b.event_type === "scenario_view")
    .map((b) => b.value);
  if (scenariosViewed.includes("optimiste")) score += 5;

  const sectionsViewed = behaviors
    .filter((b) => b.event_type === "section_view")
    .map((b) => b.section);
  if (sectionsViewed.includes("decision")) score += 5;
  if (sectionsViewed.includes("equipe_culture")) score += 3;

  // Onglets visités dans le parcours séquentiel candidat
  const tabsViewed = new Set(
    sectionsViewed.filter((s): s is string => !!s && s.startsWith("tab_")),
  );
  if (tabsViewed.size >= 2) score += 4;
  if (tabsViewed.size >= 4) score += 4;
  if (tabsViewed.size >= 6) score += 4;

  // Parcours complet
  if (sectionsViewed.includes("all_tabs_completed")) score += 10;

  // Temps cumulé sur les onglets
  const tabTime = behaviors
    .filter(
      (b) =>
        b.event_type === "section_time" &&
        b.section &&
        b.section.startsWith("tab_"),
    )
    .reduce((acc, b) => acc + (b.duration_s ?? 0), 0);
  if (tabTime >= 60) score += 3;
  if (tabTime >= 180) score += 4;
  if (tabTime >= 360) score += 3;

  const simTime = behaviors
    .filter((b) => b.event_type === "section_time" && b.section === "simulation")
    .reduce((acc, b) => acc + (b.duration_s ?? 0), 0);
  if (simTime >= 60) score += 5;
  if (simTime >= 120) score += 5;

  const aiQuestions = events.filter((e) => e.event_type === "question").length;
  if (aiQuestions >= 1) score += 5;
  if (aiQuestions >= 3) score += 5;

  const messages = events.filter((e) => e.event_type === "message_candidate").length;
  if (messages >= 1) score += 8;

  if (events.some((e) => e.event_type === "rdv_click")) score += 10;

  const externalLinks = behaviors.filter((b) => b.event_type === "external_link").length;
  if (externalLinks >= 1) score += 3;

  if (behaviors.some((b) => b.event_type === "reveal_clicked")) score += 12;

  if (link.status === "declined") score = Math.min(score, 20);
  score = Math.min(100, Math.max(0, score));

  const label: EngagementResult["label"] =
    score >= 75 ? "hot" : score >= 50 ? "warm" : score >= 25 ? "lukewarm" : "cold";

  let intent: EngagementResult["intent"];
  if (link.status === "accepted") intent = "accepted";
  else if (link.status === "declined") intent = "declined";
  else if (score >= 70 || events.some((e) => e.event_type === "rdv_click"))
    intent = "likely_accept";
  else if (score >= 45 && (link.return_visits ?? 0) > 0) intent = "uncertain";
  else if (score < 20 && link.opened_at) intent = "likely_decline";
  else if (!link.opened_at) intent = "unknown";
  else intent = "uncertain";

  await supabaseAdmin
    .from("candidate_links")
    .update({
      engagement_score: score,
      engagement_label: label,
      intent_prediction: intent,
      intent_computed_at: new Date().toISOString(),
    })
    .eq("id", linkId);

  return { score, label, intent };
}
