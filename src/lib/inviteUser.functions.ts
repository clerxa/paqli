import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InviteSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1).max(120),
  roles: z.array(z.enum(["admin", "member", "manager", "validator"])).min(1).max(4),
});

export const inviteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get caller's organization
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();
    if (profErr || !profile?.organization_id) {
      throw new Error("Organisation introuvable");
    }
    const orgId = profile.organization_id;

    // Verify caller is admin of this org
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", orgId);
    const isAdmin = (callerRoles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Réservé aux administrateurs");
    }

    const email = data.email.toLowerCase();

    // Check if a user with this email already exists
    let targetUserId: string | null = null;
    {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id, organization_id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        if (existing.organization_id && existing.organization_id !== orgId) {
          throw new Error("Cet email est déjà rattaché à une autre organisation");
        }
        targetUserId = existing.id;
      }
    }

    // If no profile, invite the user (creates auth.users entry + sends email)
    if (!targetUserId) {
      const redirectTo =
        process.env.PUBLIC_SITE_URL ?? "https://paqli.fr";
      const { data: invited, error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: data.full_name },
          redirectTo,
        });
      if (invErr || !invited?.user?.id) {
        throw new Error(invErr?.message ?? "Échec de l'invitation");
      }
      targetUserId = invited.user.id;
    }

    // Upsert profile bound to this org
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: targetUserId,
          email,
          full_name: data.full_name,
          organization_id: orgId,
        },
        { onConflict: "id" },
      );
    if (upErr) throw new Error(upErr.message);

    // Insert roles (ignore duplicates)
    for (const role of data.roles) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: targetUserId,
        organization_id: orgId,
        role: role as any,
      });
    }

    return { ok: true, userId: targetUserId };
  });
