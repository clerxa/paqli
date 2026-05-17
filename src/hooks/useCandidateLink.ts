import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPackagePublic } from "@/lib/getPackagePublic.functions";
import { trackLink } from "@/lib/trackLink.functions";
import type { PackageData } from "@/lib/clientCalc";

export interface PublicMessage {
  id: string;
  sender: "candidate" | "rh";
  content: string;
  created_at: string;
}

export interface CounterOfferInfo {
  id: string;
  changes: any;
  message: string | null;
  createdAt: string;
  originalToken: string | null;
}

export interface CandidateLinkData {
  id: string;
  token: string;
  candidate_name: string | null;
  candidate_email: string | null;
  expires_at: string | null;
  opened_at: string | null;
  simulated_at: string | null;
  return_visits: number;
  offerStatus: string;
  statusUpdatedAt: string | null;
  decisionDeadline: string | null;
  counterOffer: CounterOfferInfo | null;
  messages: PublicMessage[];
  packages: PackageData;
}

export type LinkError = "not_found" | "expired" | null;

export function useCandidateLink(token: string) {
  const [data, setData] = useState<CandidateLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LinkError>(null);
  const fetchPackage = useServerFn(getPackagePublic);
  const track = useServerFn(trackLink);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPackage({ data: { token } });
        if (cancelled) return;
        if ("ok" in res && res.ok === false) {
          setError(res.reason === "expired" ? "expired" : "not_found");
          setLoading(false);
          return;
        }
        const ok = res as Exclude<typeof res, { ok: false }>;
        setData({
          id: ok.linkId,
          token: ok.token,
          candidate_name: ok.candidateName,
          candidate_email: (ok as any).candidateEmail ?? null,
          expires_at: ok.expiresAt,
          opened_at: ok.openedAt,
          simulated_at: (ok as any).simulatedAt ?? null,
          return_visits: (ok as any).returnVisits ?? 0,
          offerStatus: ok.offerStatus,
          statusUpdatedAt: ok.statusUpdatedAt,
          decisionDeadline: (ok as any).decisionDeadline ?? null,
          counterOffer: (ok as any).counterOffer ?? null,
          messages: ok.messages,
          packages: ok.package as unknown as PackageData,
        });
        setLoading(false);
        if (!ok.openedAt) {
          void track({ data: { token, eventType: "opened" } }).catch(() => {});
        }
      } catch (e: any) {
        if (cancelled) return;
        setError("not_found");
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, fetchPackage, track]);

  return { data, loading, error, setData };
}
