import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { listJobs, type JobRow } from "@/lib/jobsService";

export function useJobs() {
  const { organization } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const rows = await listJobs(organization.id);
      setJobs(rows);
    } catch (e) {
      console.error("useJobs", e);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { jobs, loading, reload };
}
