import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { computeEngagement } from "@/lib/engagement.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
};

const InputSchema = z.object({ linkId: z.string().uuid() });

export const Route = createFileRoute("/api/public/compute-engagement")({
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
          return new Response("Invalid payload", { status: 400, headers: corsHeaders });
        }
        const result = await computeEngagement(parsed.data.linkId);
        if (!result) {
          return new Response("Link not found", { status: 404, headers: corsHeaders });
        }
        return new Response(JSON.stringify({ success: true, ...result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      },
    },
  },
});
