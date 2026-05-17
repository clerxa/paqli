import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSidebarCounts() {
  const { organization } = useAuth();
  const [counts, setCounts] = useState<{ jobs: number; packages: number; candidates: number }>({
    jobs: 0,
    packages: 0,
    candidates: 0,
  });

  const reload = useCallback(async () => {
    if (!organization) return;
    const orgId = organization.id;
    const [jobsRes, packagesRes, candidatesRes] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("packages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("candidate_links").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);
    setCounts({
      jobs: jobsRes.count ?? 0,
      packages: packagesRes.count ?? 0,
      candidates: candidatesRes.count ?? 0,
    });
  }, [organization]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!organization) return;
    const channel = supabase
      .channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `organization_id=eq.${organization.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "packages", filter: `organization_id=eq.${organization.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "candidate_links", filter: `organization_id=eq.${organization.id}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization, reload]);

  return counts;
}
