import { supabase } from "@/integrations/supabase/client";

export async function generateCandidateLink(
  packageId: string,
  orgId: string,
  candidateEmail?: string,
  candidateName?: string,
  expiresInDays: number | null = 30,
  decisionDeadline?: Date | null,
): Promise<{ token: string; id: string }> {
  // Check monthly quota before creating
  const { data: org } = await supabase
    .from("organizations")
    .select("monthly_link_quota")
    .eq("id", orgId)
    .maybeSingle();

  const quota = org?.monthly_link_quota as number | null | undefined;
  if (quota != null) {
    const { data: usedRaw } = await supabase.rpc("links_sent_this_month", { _org_id: orgId });
    const used = typeof usedRaw === "number" ? usedRaw : 0;
    if (used >= quota) {
      throw new Error(
        `Quota mensuel atteint (${used}/${quota} liens). Passez à un plan supérieur pour en envoyer davantage.`,
      );
    }
  }

  let expiresAt: string | null = null;
  if (expiresInDays) {
    const d = new Date();
    d.setDate(d.getDate() + expiresInDays);
    expiresAt = d.toISOString();
  }

  const { data, error } = await supabase
    .from("candidate_links")
    .insert({
      package_id: packageId,
      organization_id: orgId,
      candidate_email: candidateEmail || null,
      candidate_name: candidateName || null,
      expires_at: expiresAt,
      decision_deadline: decisionDeadline ? decisionDeadline.toISOString() : null,
    })
    .select("id, token")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erreur génération lien");
  return { token: data.token, id: data.id };
}

export async function publishPackage(packageId: string) {
  const { error } = await supabase
    .from("packages")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", packageId);
  if (error) throw error;
}

export function buildCandidateUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/p/${token}`;
  }
  return `/p/${token}`;
}
