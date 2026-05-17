import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VALID_CATEGORIES = [
  "salary",
  "equity",
  "location",
  "other_offer",
  "role",
  "culture",
  "other",
] as const;

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  status: z.enum(["accepted", "declined", "thinking"]),
  declineCategory: z.enum(VALID_CATEGORIES).optional().nullable(),
  declineReason: z.string().max(300).optional().nullable(),
  thinkingNote: z.string().max(300).optional().nullable(),
});

export const updateOfferStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const data = InputSchema.parse(input);
    if (data.status === "declined" && !data.declineCategory) {
      throw new Error("Catégorie de refus requise");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("candidate_links")
      .select("id, status")
      .eq("token", data.token)
      .maybeSingle();

    if (error || !link) {
      throw new Response("Link not found", { status: 404 });
    }

    const previousStatus = link.status;
    const isChange =
      previousStatus !== "pending" && previousStatus !== data.status;

    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: data.status,
      status_updated_at: nowIso,
      decline_category:
        data.status === "declined" ? (data.declineCategory ?? null) : null,
      decline_reason:
        data.status === "declined" && data.declineReason
          ? data.declineReason.slice(0, 300)
          : null,
      thinking_at: data.status === "thinking" ? nowIso : null,
      thinking_note:
        data.status === "thinking" && data.thinkingNote
          ? data.thinkingNote.slice(0, 300)
          : null,
    };

    await supabaseAdmin
      .from("candidate_links")
      .update(updatePayload)
      .eq("id", link.id);

    const eventType = isChange
      ? "decision_changed"
      : data.status === "accepted"
        ? "offer_accepted"
        : data.status === "declined"
          ? "offer_declined"
          : "status_thinking";

    await supabaseAdmin.from("link_events").insert({
      link_id: link.id,
      event_type: eventType,
      metadata: {
        previous_status: previousStatus,
        new_status: data.status,
        decline_category: data.declineCategory ?? null,
        decline_reason_preview: data.declineReason
          ? data.declineReason.slice(0, 50)
          : null,
        thinking_note_preview: data.thinkingNote
          ? data.thinkingNote.slice(0, 50)
          : null,
      } as any,
    });

    return {
      success: true,
      status: data.status,
      statusUpdatedAt: nowIso,
      thinkingAt: data.status === "thinking" ? nowIso : null,
      thinkingNote:
        data.status === "thinking"
          ? (data.thinkingNote?.slice(0, 300) ?? null)
          : null,
    };
  });
