import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  linkId: z.string().uuid(),
  enabled: z.boolean(),
});

export const toggleLinkReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("candidate_links")
      .update({ reminders_enabled: data.enabled })
      .eq("id", data.linkId);
    if (error) throw new Error(error.message);
    return { success: true, enabled: data.enabled };
  });
