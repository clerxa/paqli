import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VALID_EVENTS = ["opened", "simulated", "question", "rdv_click"] as const;

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  eventType: z.enum(VALID_EVENTS),
  metadata: z.record(z.string().min(1).max(64), z.unknown()).optional(),
});

export const trackLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("candidate_links")
      .select("id, opened_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (error || !link) {
      throw new Response("Link not found", { status: 404 });
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Response("Link expired", { status: 410 });
    }

    await supabaseAdmin.from("link_events").insert({
      link_id: link.id,
      event_type: data.eventType,
      metadata: data.metadata ?? {},
    });

    if (data.eventType === "opened" && !link.opened_at) {
      await supabaseAdmin
        .from("candidate_links")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", link.id);
    }
    if (data.eventType === "simulated") {
      await supabaseAdmin
        .from("candidate_links")
        .update({ simulated_at: new Date().toISOString() })
        .eq("id", link.id);
    }

    return { success: true };
  });
