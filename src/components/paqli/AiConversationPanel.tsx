import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AiConversationRow {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export function AiConversationPanel({ linkId }: { linkId: string }) {
  const [rows, setRows] = useState<AiConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, question, answer, created_at")
        .eq("link_id", linkId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setRows((data ?? []) as AiConversationRow[]);
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`ai-conv-${linkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_conversations",
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          setRows((prev) => [...prev, payload.new as AiConversationRow]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [linkId]);

  if (loading) {
    return (
      <div className="text-[13px] text-grey italic py-2">Chargement…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-[13px] text-grey italic py-2">
        Le candidat n'a pas encore posé de question à l'assistant IA.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-grey">
        {rows.length} question{rows.length > 1 ? "s" : ""} posée
        {rows.length > 1 ? "s" : ""} à l'assistant IA
      </div>
      {rows.map((r) => (
        <div key={r.id} className="space-y-2">
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: "#F5F2FA" }}
          >
            <div className="text-[10px] uppercase tracking-wider text-grey mb-1">
              Candidat · {new Date(r.created_at).toLocaleString("fr-FR")}
            </div>
            <div className="text-[13px] text-aubergine whitespace-pre-wrap">
              {r.question}
            </div>
          </div>
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: "#FAF8F5" }}
          >
            <div className="text-[10px] uppercase tracking-wider text-grey mb-1">
              Assistant Paqli
            </div>
            <div className="text-[13px] text-aubergine whitespace-pre-wrap leading-relaxed">
              {r.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
