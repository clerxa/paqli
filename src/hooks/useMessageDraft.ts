import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { draftMessageFn } from "@/lib/aiAssistant.functions";

export type AlertType =
  | "not_opened_48h"
  | "opened_not_sim"
  | "sim_no_response"
  | "counter_offer"
  | "general";

export function useMessageDraft() {
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const call = useServerFn(draftMessageFn);

  async function generateDraft(linkId: string, alertType: AlertType = "general") {
    setLoading(true);
    setError(null);
    try {
      const r = await call({ data: { linkId, alertType } });
      setDraft(r.draft);
    } catch (err) {
      console.error("Draft generation error:", err);
      setError("Génération impossible");
    } finally {
      setLoading(false);
    }
  }

  return { draft, loading, error, generateDraft, setDraft };
}
