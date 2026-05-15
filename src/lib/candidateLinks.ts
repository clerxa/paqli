import { supabase } from "@/integrations/supabase/client";

export async function generateCandidateLink(
  packageId: string,
  orgId: string,
  candidateEmail?: string,
  candidateName?: string,
  expiresInDays: number | null = 30,
  decisionDeadline?: Date | null,
): Promise<{ token: string; id: string }> {
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
