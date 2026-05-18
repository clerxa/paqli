import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBenchmarkAnalysis,
  type BenchmarkAnalysis,
} from "@/lib/benchmarkAnalysis.functions";

export function useBenchmarkAnalysis(token: string | null | undefined) {
  const fetcher = useServerFn(getBenchmarkAnalysis);

  const query = useQuery<BenchmarkAnalysis | null>({
    queryKey: ["benchmark-analysis", token],
    enabled: !!token,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!token) return null;
      return await fetcher({ data: { token } });
    },
  });

  return {
    analysis: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
