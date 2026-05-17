import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeEngagement } from "@/lib/engagement.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
};

const VALID_EVENTS = [
  "section_view",
  "section_time",
  "simulation_change",
  "scenario_view",
  "external_link",
  "page_exit",
  "page_return",
  "opened",
  "simulated",
  "reveal_clicked",
] as const;

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  eventType: z.enum(VALID_EVENTS),
  section: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  durationS: z.number().int().min(0).max(86400).optional(),
});

export const Route = createFileRoute("/api/public/track-behavior")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let raw: any;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
        }

        const parsed = InputSchema.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Invalid payload" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const { token, eventType, section, value, durationS } = parsed.data;

        const { data: link } = await supabaseAdmin
          .from("candidate_links")
          .select("id, opened_at, simulated_at, return_visits, time_on_page_total, expires_at")
          .eq("token", token)
          .maybeSingle();

        if (!link) {
          return new Response("Link not found", { status: 404, headers: corsHeaders });
        }
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          return new Response("Link expired", { status: 410, headers: corsHeaders });
        }

        await supabaseAdmin.from("behavior_events").insert({
          link_id: link.id,
          event_type: eventType,
          section: section ?? null,
          value: value !== undefined ? String(value).slice(0, 100) : null,
          duration_s: durationS ?? null,
        });

        const updates: {
          opened_at?: string;
          simulated_at?: string;
          return_visits?: number;
          time_on_page_total?: number;
        } = {};
        if (eventType === "opened" && !link.opened_at) {
          updates.opened_at = new Date().toISOString();
        }
        if (eventType === "simulated") {
          updates.simulated_at = new Date().toISOString();
        }
        if (eventType === "page_return") {
          updates.return_visits = (link.return_visits ?? 0) + 1;
        }
        if (eventType === "page_exit" && durationS) {
          updates.time_on_page_total = (link.time_on_page_total ?? 0) + durationS;
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from("candidate_links")
            .update(updates)
            .eq("id", link.id);
        }

        // Recompute engagement synchronously (fire-and-forget fetch is killed
        // by the Worker runtime without waitUntil).
        try {
          await computeEngagement(link.id);
        } catch (e) {
          console.error("[track-behavior] computeEngagement failed", e);
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      },
    },
  },
});
