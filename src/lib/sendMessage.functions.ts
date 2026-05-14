import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CandidateInput = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  content: z.string().min(2).max(2000),
});

export const sendCandidateMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CandidateInput.parse(input))
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("candidate_links")
      .select("id, candidate_name, packages(title, created_by, organizations(name))")
      .eq("token", data.token)
      .maybeSingle();

    if (error || !link) {
      throw new Response("Link not found", { status: 404 });
    }

    const content = data.content.trim().slice(0, 2000);

    await supabaseAdmin.from("messages").insert({
      link_id: link.id,
      sender: "candidate",
      content,
    });

    await supabaseAdmin.from("link_events").insert({
      link_id: link.id,
      event_type: "message_candidate",
      metadata: { preview: content.slice(0, 60) } as any,
    });

    // TODO: notify RH via email (Resend / Lovable Emails)
    console.log(
      `[message] candidate→RH org=${(link.packages as any)?.organizations?.name} preview="${content.slice(0, 60)}"`,
    );

    return { success: true };
  });

const RhInput = z.object({
  linkId: z.string().uuid(),
  content: z.string().min(2).max(2000),
});

export const sendRhMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RhInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // RLS will scope to the user's organization
    const { data: link, error } = await supabase
      .from("candidate_links")
      .select("id, candidate_email, candidate_name")
      .eq("id", data.linkId)
      .maybeSingle();

    if (error || !link) {
      throw new Response("Link not found", { status: 404 });
    }

    const content = data.content.trim().slice(0, 2000);

    await supabase.from("messages").insert({
      link_id: link.id,
      sender: "rh",
      content,
    });

    await supabaseAdmin.from("link_events").insert({
      link_id: link.id,
      event_type: "message_rh",
      metadata: { preview: content.slice(0, 60) } as any,
    });

    // TODO: notify candidate via email
    console.log(
      `[message] RH→candidate ${link.candidate_email} preview="${content.slice(0, 60)}"`,
    );

    return { success: true };
  });
