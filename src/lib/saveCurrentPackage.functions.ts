import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BenefitSchema = z.object({
  label: z.string().min(1).max(120),
  annual_value: z.number().min(0).max(1_000_000),
});

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  payload: z.object({
    gross_salary: z.number().min(0).max(2_000_000).nullable().optional(),
    variable_target: z.number().min(0).max(2_000_000).nullable().optional(),
    benefits: z.array(BenefitSchema).max(5).optional(),
    note: z.string().max(500).nullable().optional(),
  }),
});

export const saveCurrentPackage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: link, error: fetchError } = await supabaseAdmin
      .from("candidate_links")
      .select("id, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (fetchError || !link) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { ok: false as const, reason: "expired" as const };
    }

    const { error: updateError } = await supabaseAdmin
      .from("candidate_links")
      .update({
        candidate_current_package: data.payload,
        candidate_current_package_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    if (updateError) {
      return { ok: false as const, reason: "update_failed" as const };
    }
    return { ok: true as const, savedAt: new Date().toISOString() };
  });
