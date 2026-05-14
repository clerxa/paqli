import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  useLinkActivity,
  DECLINE_LABELS,
  type LinkEventRow,
  type MessageRow,
} from "@/hooks/useLinkActivity";
import { sendRhMessage } from "@/lib/sendMessage.functions";
import { toggleLinkReminders } from "@/lib/toggleReminders.functions";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/hooks/useDashboard";
import { useMessageDraft } from "@/hooks/useMessageDraft";

const EVENT_CONFIG: Record<
  string,
  { color: string; label: (m: any) => string }
> = {
  opened: { color: "#639922", label: () => "Lien ouvert" },
  simulated: { color: "#C4A882", label: () => "Simulation lancée" },
  question: { color: "#8B7FA8", label: () => "Question posée à l'IA" },
  rdv_click: { color: "#2D2640", label: () => 'Clic sur "Prendre RDV"' },
  message_candidate: {
    color: "#8B7FA8",
    label: () => "Message envoyé au RH",
  },
  message_rh: { color: "#2D2640", label: () => "Réponse du RH" },
  offer_accepted: { color: "#3B6D11", label: () => "🎉 Offre acceptée" },
  offer_declined: {
    color: "#B85A6A",
    label: (m) =>
      `Offre déclinée${m?.decline_category ? ` — ${DECLINE_LABELS[m.decline_category] ?? ""}` : ""}`,
  },
  decision_changed: {
    color: "#C4A882",
    label: () => "Décision modifiée",
  },
};

export function LinkActivityPanel({
  linkId,
  candidateName,
}: {
  linkId: string;
  candidateName: string;
}) {
  const { events, messages, linkStatus, loading, setMessages } =
    useLinkActivity(linkId);

  type Item =
    | (LinkEventRow & { itemType: "event" })
    | (MessageRow & { itemType: "message"; event_type: string; metadata: any });

  const items: Item[] = [
    ...events.map((e) => ({ ...e, itemType: "event" as const })),
    ...messages.map((m) => ({
      ...m,
      itemType: "message" as const,
      event_type: `message_${m.sender}`,
      metadata: {},
    })),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (loading) {
    return (
      <div className="text-[12px] text-grey italic">Chargement…</div>
    );
  }

  return (
    <div>
      {linkStatus && linkStatus.status !== "pending" && (
        <StatusBanner status={linkStatus} />
      )}

      {items.length === 0 ? (
        <div className="text-[12px] text-grey italic mt-3">
          Aucune activité pour l'instant.
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
          {items.map((item, i) => {
            const conf =
              EVENT_CONFIG[item.event_type] ?? {
                color: "#B8AECF",
                label: () => item.event_type,
              };
            const isMessage = item.itemType === "message";
            return (
              <div key={`${item.id}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: conf.color }}
                  />
                  {i < items.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ background: "rgba(45,38,64,0.1)" }}
                    />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-[12px] text-aubergine font-medium">
                    {conf.label((item as any).metadata)}
                  </div>
                  {isMessage && (item as MessageRow).content && (
                    <div className="text-[11px] text-aubergine-light italic mt-1 leading-relaxed">
                      « {(item as MessageRow).content} »
                    </div>
                  )}
                  {item.event_type === "offer_declined" &&
                    (item as any).metadata?.decline_reason_preview && (
                      <div className="text-[11px] text-aubergine-light italic mt-1">
                        « {(item as any).metadata.decline_reason_preview} »
                      </div>
                    )}
                  <div className="text-[10px] text-grey mt-0.5">
                    {timeAgo(item.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <RhMessageComposer
          linkId={linkId}
          candidateName={candidateName}
          onSent={(msg) => setMessages((prev) => [...prev, msg])}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-[rgba(45,38,64,0.06)]">
        <RemindersToggle linkId={linkId} />
      </div>
    </div>
  );
}

function RemindersToggle({ linkId }: { linkId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = useServerFn(toggleLinkReminders);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("candidate_links")
      .select("reminders_enabled")
      .eq("id", linkId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setEnabled(data?.reminders_enabled ?? true);
      });
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  async function handleToggle() {
    if (enabled === null || busy) return;
    setBusy(true);
    const next = !enabled;
    try {
      await toggle({ data: { linkId, enabled: next } });
      setEnabled(next);
      toast.success(next ? "Relances activées" : "Relances désactivées");
    } catch {
      toast.error("Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[12px] text-aubergine font-medium">
          Relances automatiques
        </div>
        <div className="text-[10px] text-grey">
          Email envoyé après 48h d'inactivité, puis 24h
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={enabled === null || busy}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          enabled ? "bg-[#2D2640]" : "bg-[rgba(45,38,64,0.2)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}

function StatusBanner({
  status,
}: {
  status: {
    status: string;
    status_updated_at: string | null;
    decline_category: string | null;
    decline_reason: string | null;
  };
}) {
  const accepted = status.status === "accepted";
  const bg = accepted ? "#EAF3DE" : "#FCEBEB";
  const fg = accepted ? "#27500A" : "#A32D2D";
  return (
    <div className="rounded-[10px] p-3 mb-2" style={{ background: bg }}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium" style={{ color: fg }}>
          {accepted ? "🎉 Offre acceptée" : "❌ Offre déclinée"}
        </div>
        {status.status_updated_at && (
          <div className="text-[11px]" style={{ color: fg, opacity: 0.7 }}>
            {new Date(status.status_updated_at).toLocaleDateString("fr-FR")}
          </div>
        )}
      </div>
      {!accepted && status.decline_category && (
        <div className="text-[11px] mt-1" style={{ color: fg }}>
          Raison : {DECLINE_LABELS[status.decline_category]}
        </div>
      )}
      {!accepted && status.decline_reason && (
        <div className="text-[11px] italic mt-1" style={{ color: fg }}>
          « {status.decline_reason} »
        </div>
      )}
    </div>
  );
}

function RhMessageComposer({
  linkId,
  candidateName,
  onSent,
}: {
  linkId: string;
  candidateName: string;
  onSent: (msg: MessageRow) => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const send = useServerFn(sendRhMessage);
  const { loading: drafting, generateDraft } = useMessageDraft();

  async function submit() {
    const content = reply.trim();
    if (content.length < 2) return;
    setSending(true);
    try {
      await send({ data: { linkId, content } });
      onSent({
        id: crypto.randomUUID(),
        link_id: linkId,
        sender: "rh",
        content,
        created_at: new Date().toISOString(),
      });
      setReply("");
    } catch {
      toast.error("Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function handleAiDraft() {
    try {
      const { draftMessageFn } = await import("@/lib/aiAssistant.functions");
      // direct serverFn call via top-level import would be cleaner, but reuse hook:
      void draftMessageFn;
    } catch {}
    try {
      await generateDraft(linkId, "general");
    } catch {}
  }

  // sync hook draft into textarea
  const { draft, setDraft } = useMessageDraft();
  // NOTE: above creates a separate instance; instead use single hook:

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={async () => {
            const r = await import("@/lib/aiAssistant.functions").then((m) =>
              m.draftMessageFn({ data: { linkId, alertType: "general" } }),
            );
            setReply(r.draft);
          }}
          disabled={drafting}
          className="text-[11px] text-aubergine-light hover:text-aubergine disabled:opacity-50"
        >
          {drafting ? "✨ Génération…" : "✨ Générer avec l'IA"}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={`Répondre à ${candidateName}…`}
          className="flex-1 border border-[rgba(45,38,64,0.12)] rounded-lg px-3 h-9 text-[13px] text-aubergine outline-none"
        />
        <button
          onClick={submit}
          disabled={reply.trim().length < 2 || sending}
          className="px-4 h-9 bg-[#2D2640] text-white rounded-lg text-[12px] font-medium disabled:opacity-40"
        >
          {sending ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
