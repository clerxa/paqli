import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listHrAlerts,
  refreshHrAlerts,
  updateHrAlertStatus,
  markAllAlertsRead,
  type HrAlert,
} from "@/lib/hrAlerts.functions";

export function useHrAlerts() {
  const list = useServerFn(listHrAlerts);
  const refresh = useServerFn(refreshHrAlerts);
  const update = useServerFn(updateHrAlertStatus);
  const markAll = useServerFn(markAllAlertsRead);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hr-alerts"],
    queryFn: async (): Promise<HrAlert[]> => {
      // Trigger detection (cheap, idempotent thanks to unique index)
      await refresh({ data: undefined }).catch(() => null);
      const result = await list({ data: {} });
      return result as HrAlert[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; status: HrAlert["status"] }) =>
      update({ data: args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-alerts"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAll({ data: undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-alerts"] }),
  });

  const alerts = query.data ?? [];
  const unreadCount = alerts.filter((a) => a.status === "unread").length;

  return {
    alerts,
    unreadCount,
    isLoading: query.isLoading,
    update: updateMutation.mutate,
    markAllRead: markAllMutation.mutate,
  };
}
