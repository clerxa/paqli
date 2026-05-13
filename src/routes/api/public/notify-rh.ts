import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NOTIFY_EVENTS = new Set(["simulated", "question", "rdv_click"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret",
};

export const Route = createFileRoute("/api/public/notify-rh")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        // Optional shared secret validation
        const expectedSecret = process.env.NOTIFY_RH_WEBHOOK_SECRET;
        if (expectedSecret) {
          const provided = request.headers.get("x-webhook-secret");
          if (provided !== expectedSecret) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
          }
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
        }

        const record = payload?.record;
        if (!record?.link_id || !record?.event_type) {
          return new Response("Missing record", { status: 400, headers: corsHeaders });
        }
        if (!NOTIFY_EVENTS.has(record.event_type)) {
          return new Response(JSON.stringify({ skipped: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: link } = await supabaseAdmin
          .from("candidate_links")
          .select(
            `candidate_name,
             packages (
               title, created_by,
               organizations ( name )
             )`,
          )
          .eq("id", record.link_id)
          .maybeSingle();

        if (!link) {
          return new Response("Link not found", { status: 404, headers: corsHeaders });
        }

        const pkg: any = link.packages;
        let rhEmail: string | null = null;
        let rhName: string | null = null;
        if (pkg?.created_by) {
          const { data: rh } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("id", pkg.created_by)
            .maybeSingle();
          rhEmail = rh?.email ?? null;
          rhName = rh?.full_name ?? null;
        }

        const candidate = link.candidate_name ?? "Un candidat";
        const messages: Record<string, string> = {
          simulated: `${candidate} vient de lancer une simulation sur le package "${pkg?.title}".`,
          question: `${candidate} vient de poser une question via l'assistant IA sur le package "${pkg?.title}".`,
          rdv_click: `${candidate} vient de cliquer sur "Prendre rendez-vous" pour le package "${pkg?.title}".`,
        };
        const message = messages[record.event_type];

        // V1: log uniquement. Email via Resend ajouté au prompt 8.
        console.log(
          `[notify-rh] org="${pkg?.organizations?.name}" rh="${rhName}" <${rhEmail}> :: ${message}`,
        );

        return new Response(
          JSON.stringify({ success: true, rhEmail, message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      },
    },
  },
});
