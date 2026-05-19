import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  jobFamily: string;
  seniority: string;
  location: string;
  fixedSalary: number;
}

interface Bench {
  p25: number;
  p50: number;
  p75: number;
  source: string | null;
  version: string | null;
}

const seniorityKey = (s: string): string => {
  const v = s.toLowerCase();
  if (v.startsWith("jun")) return "junior";
  if (v.startsWith("conf")) return "confirmed";
  if (v.startsWith("sen") || v.startsWith("sén")) return "senior";
  if (v.startsWith("exp") || v.startsWith("lead") || v.startsWith("staff"))
    return "expert";
  return v;
};

const locationKey = (l: string) => l.toLowerCase().trim();

export function BenchmarkBadge({
  jobFamily,
  seniority,
  location,
  fixedSalary,
}: Props) {
  const [bench, setBench] = useState<Bench | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobFamily || !seniority || !location) {
      setBench(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("salary_benchmarks")
        .select("p25,p50,p75,source,version")
        .eq("job_family", jobFamily)
        .eq("seniority", seniorityKey(seniority))
        .eq("location", locationKey(location))
        .maybeSingle();
      if (cancelled) return;
      setLoading(false);
      if (data) {
        setBench({
          p25: Number(data.p25),
          p50: Number(data.p50),
          p75: Number(data.p75),
          source: data.source,
          version: data.version,
        });
      } else {
        setBench(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobFamily, seniority, location]);

  if (loading) {
    return (
      <div className="text-[11px] text-grey italic">Recherche benchmark…</div>
    );
  }
  if (!bench) {
    if (jobFamily && seniority && location) {
      return (
        <div className="text-[11px] text-grey italic">
          Aucun benchmark disponible pour ce profil.
        </div>
      );
    }
    return null;
  }
  const fmt = (n: number) =>
    `${Math.round(n / 1000)}k€`;
  let positioning = "Aligné marché";
  let color = "#2D2640";
  if (fixedSalary > 0) {
    if (fixedSalary < bench.p25) {
      positioning = `Sous marché (–${Math.round(((bench.p50 - fixedSalary) / bench.p50) * 100)}%)`;
      color = "#B85C5C";
    } else if (fixedSalary > bench.p75) {
      positioning = `Au-dessus marché (+${Math.round(((fixedSalary - bench.p50) / bench.p50) * 100)}%)`;
      color = "#5C8B7A";
    } else {
      const diff = Math.round(((fixedSalary - bench.p50) / bench.p50) * 100);
      positioning =
        diff === 0 ? "Aligné médiane" : diff > 0 ? `+${diff}% vs médiane` : `${diff}% vs médiane`;
    }
  }
  return (
    <div
      className="mt-2 rounded-md px-3 py-2 text-[11px] leading-relaxed"
      style={{ background: "#F0EBE8", color: "#3D3554" }}
    >
      <div className="flex items-center justify-between">
        <span>
          <span className="mr-1.5">📊</span>
          Marché : <strong>{fmt(bench.p25)} – {fmt(bench.p75)}</strong>{" "}
          (médiane {fmt(bench.p50)})
        </span>
        {fixedSalary > 0 && (
          <span
            className="font-medium"
            style={{ color }}
          >
            {positioning}
          </span>
        )}
      </div>
      <div className="text-[10px] text-grey mt-0.5">
        Source : {bench.source ?? "—"} {bench.version ? `· ${bench.version}` : ""}
      </div>
    </div>
  );
}
