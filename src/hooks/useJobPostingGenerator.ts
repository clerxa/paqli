import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateJobPostingFn } from "@/lib/aiAssistant.functions";

export function useJobPostingGenerator() {
  const [posting, setPosting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const call = useServerFn(generateJobPostingFn);

  async function generate(packageId: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await call({ data: { packageId } });
      setPosting(r.posting);
    } catch (err) {
      console.error("Job posting error:", err);
      setError("Génération temporairement indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return { posting, loading, error, generate, setPosting };
}
