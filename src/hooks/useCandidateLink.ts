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
  expires_at: string | null;
  opened_at: string | null;
  offerStatus: string;
  statusUpdatedAt: string | null;
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
        setData({
          id: res.linkId,
          token: res.token,
          candidate_name: res.candidateName,
          expires_at: res.expiresAt,
          opened_at: res.openedAt,
          offerStatus: res.offerStatus,
          statusUpdatedAt: res.statusUpdatedAt,
          counterOffer: (res as any).counterOffer ?? null,
          messages: res.messages,
          packages: res.package as unknown as PackageData,
        });
        setLoading(false);
        if (!res.openedAt) {
          void track({ data: { token, eventType: "opened" } });
        }
      } catch (e: any) {
        if (cancelled) return;
        let kind: LinkError = "not_found";
        try {
          if (e instanceof Response) {
            if (e.status === 410) kind = "expired";
            else kind = "not_found";
          } else {
            const msg = String(e?.message ?? "");
            if (msg.includes("410") || msg.toLowerCase().includes("expired"))
              kind = "expired";
          }
        } catch {
          // ignore
        }
        setError(kind);
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
