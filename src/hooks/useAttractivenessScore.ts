import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  scoreAttractivenessFn,
  type AttractivenessResult,
} from "@/lib/aiAssistant.functions";

export function useAttractivenessScore() {
  const [result, setResult] = useState<AttractivenessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score = useServerFn(scoreAttractivenessFn);

  const compute = useCallback(
    async (packageId: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await score({ data: { packageId } });
        setResult(r);
      } catch (err) {
        console.error("Attractiveness score error:", err);
        setError("Analyse temporairement indisponible");
      } finally {
        setLoading(false);
      }
    },
    [score],
  );

  return { result, loading, error, compute };
}
