import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateOfferStatus } from "@/lib/updateOfferStatus.functions";
import { sendCandidateMessage } from "@/lib/sendMessage.functions";
import type {
  CandidateLinkData,
  PublicMessage,
} from "@/hooks/useCandidateLink";

const DECLINE_OPTIONS = [
  { key: "salary", label: "💰 Rémunération fixe" },
  { key: "equity", label: "📈 Equity peu convaincant" },
  { key: "location", label: "📍 Localisation / télétravail" },
  { key: "other_offer", label: "🏆 Autre offre plus attractive" },
  { key: "role", label: "💼 Le poste ne correspond plus" },
  { key: "culture", label: "🏢 Culture d'entreprise" },
  { key: "other", label: "❓ Autre raison" },
] as const;

function formatFrDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DecisionBlock({
  data,
  orgName,
  pkgTitle,
  onStatusChange,
}: {
  data: CandidateLinkData;
  orgName: string;
  pkgTitle: string;
  onStatusChange: (status: string, statusUpdatedAt: string) => void;
}) {
  const [showAccept, setShowAccept] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineCategory, setDeclineCategory] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = useServerFn(updateOfferStatus);

  const status = data.offerStatus;
  const statusUpdatedAt = data.statusUpdatedAt;
  const firstName = data.candidate_name
    ? data.candidate_name.trim().split(/\s+/)[0] ?? null
    : null;

  async function handleAccept() {
    setSubmitting(true);
    try {
      const res = await update({
        data: { token: data.token, status: "accepted" },
      });
      onStatusChange("accepted", res.statusUpdatedAt);
      setShowAccept(false);
      toast.success("Votre acceptation a été transmise.");
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!declineCategory) return;
    setSubmitting(true);
    try {
      const res = await update({
        data: {
          token: data.token,
          status: "declined",
          declineCategory: declineCategory as any,
          declineReason: declineReason || null,
        },
      });
      onStatusChange("declined", res.statusUpdatedAt);
      setShowDecline(false);
      setDeclineCategory(null);
      setDeclineReason("");
      toast.success("Votre réponse a été transmise.");
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light font-medium mb-3">
        Votre décision
      </div>

      {status === "pending" && (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5">
          <p className="text-[13px] text-aubergine-light leading-relaxed mb-4">
            Vous pouvez indiquer à <strong>{orgName}</strong> si vous souhaitez
            donner suite à cette offre. Cette information leur sera communiquée
            immédiatement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAccept(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#EAF3DE] text-[#27500A] border border-[rgba(59,109,17,0.2)] rounded-lg py-3 text-[13px] font-medium hover:bg-[#D5EBC0] transition-colors"
            >
              ✅ Accepter l'offre {orgName}
            </button>
            <button
              onClick={() => setShowDecline(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FCEBEB] text-[#A32D2D] border border-[rgba(184,90,106,0.2)] rounded-lg py-3 text-[13px] font-medium hover:bg-[#F7D5D5] transition-colors"
            >
              ❌ Décliner cette offre
            </button>
          </div>
          <p className="text-[11px] text-grey mt-3 text-center">
            Vous pourrez modifier votre décision jusqu'à la signature du contrat.
          </p>
        </div>
      )}

      {status === "accepted" && (
        <div className="rounded-[12px] p-5" style={{ background: "#EAF3DE" }}>
          <div className="flex items-start gap-3">
            <div style={{ fontSize: 22 }}>✅</div>
            <div className="flex-1">
              <div
                className="font-display text-[#27500A]"
                style={{ fontSize: 16 }}
              >
                {firstName
                  ? `${firstName}, votre décision est enregistrée`
                  : "Votre décision est enregistrée"}
              </div>
              <div className="text-[12px] text-[#3B6D11] mt-1">
                Le {formatFrDate(statusUpdatedAt)} · L'équipe RH de {orgName} a
                été notifiée
              </div>
              <p className="text-[12px] text-[#27500A] mt-3 leading-relaxed">
                L'équipe de {orgName} vous contactera prochainement pour la
                suite du processus.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDecline(true)}
            className="mt-3 text-[11px] text-[#27500A] underline opacity-70 hover:opacity-100"
          >
            Vous avez changé d'avis ? Modifier ma décision
          </button>
        </div>
      )}

      {status === "declined" && (
        <div className="rounded-[12px] p-5" style={{ background: "#FCEBEB" }}>
          <div className="flex items-start gap-3">
            <div style={{ fontSize: 22 }}>❌</div>
            <div className="flex-1">
              <div
                className="font-display text-[#A32D2D]"
                style={{ fontSize: 16 }}
              >
                Vous avez décliné cette offre
              </div>
              <div className="text-[12px] text-[#A32D2D] opacity-80 mt-1">
                Le {formatFrDate(statusUpdatedAt)} · Merci pour votre retour
              </div>
              <p className="text-[12px] text-[#A32D2D] mt-3 leading-relaxed">
                Bonne continuation dans votre recherche.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAccept(true)}
            className="mt-3 text-[11px] text-[#A32D2D] underline opacity-70 hover:opacity-100"
          >
            Vous avez changé d'avis ? Modifier ma décision
          </button>
        </div>
      )}

      {/* Accept modal */}
      {showAccept && (
        <Modal onClose={() => setShowAccept(false)}>
          <div className="text-center mb-4" style={{ fontSize: 32 }}>
            ✅
          </div>
          <h3
            className="font-display text-aubergine text-center mb-3"
            style={{ fontSize: 20 }}
          >
            Accepter l'offre
          </h3>
          <p className="text-[13px] text-aubergine-light leading-relaxed text-center mb-5">
            {firstName
              ? `${firstName}, vous êtes sur le point d'accepter`
              : "Vous êtes sur le point d'accepter"}{" "}
            l'offre de <strong>{orgName}</strong> pour le poste de{" "}
            <strong>{pkgTitle}</strong>. L'équipe RH sera notifiée immédiatement.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAccept(false)}
              className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light"
            >
              Annuler
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#27500A] text-white rounded-lg text-[13px] font-medium disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Confirmer mon acceptation"}
            </button>
          </div>
        </Modal>
      )}

      {/* Decline modal */}
      {showDecline && (
        <Modal onClose={() => setShowDecline(false)}>
          <div className="text-center mb-4" style={{ fontSize: 32 }}>
            ❌
          </div>
          <h3
            className="font-display text-aubergine text-center mb-3"
            style={{ fontSize: 20 }}
          >
            Décliner l'offre
          </h3>
          <p className="text-[13px] text-aubergine-light leading-relaxed text-center mb-1">
            Pour aider <strong>{orgName}</strong> à améliorer ses offres
            futures, pouvez-vous indiquer la raison principale ?
          </p>
          <p className="text-[11px] text-grey text-center mb-4 italic">
            (confidentielle — uniquement visible par {orgName})
          </p>

          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {DECLINE_OPTIONS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setDeclineCategory(cat.key)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors"
                style={{
                  background:
                    declineCategory === cat.key ? "#2D2640" : "#FFFFFF",
                  color: declineCategory === cat.key ? "#FFFFFF" : "#524970",
                  borderColor:
                    declineCategory === cat.key
                      ? "#2D2640"
                      : "rgba(45,38,64,0.15)",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value.slice(0, 300))}
            placeholder="Précisez si vous le souhaitez… (optionnel)"
            className="w-full border border-[rgba(45,38,64,0.12)] rounded-lg p-3 text-[12px] text-aubergine resize-none h-20 placeholder:text-grey mb-1 outline-none"
          />
          <div className="text-[10px] text-grey text-right mb-4">
            {declineReason.length}/300
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDecline(false)}
              className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light"
            >
              Annuler
            </button>
            <button
              onClick={handleDecline}
              disabled={!declineCategory || submitting}
              className="flex-1 py-2.5 bg-[#A32D2D] text-white rounded-lg text-[13px] font-medium disabled:opacity-40"
            >
              {submitting ? "Envoi…" : "Confirmer mon refus"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export function CandidateMessagingBlock({
  token,
  orgName,
  initialMessages,
}: {
  token: string;
  orgName: string;
  initialMessages: PublicMessage[];
}) {
  const [messages, setMessages] = useState<PublicMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const send = useServerFn(sendCandidateMessage);

  async function handleSend() {
    const content = newMessage.trim();
    if (content.length < 2) return;
    setSending(true);
    try {
      await send({ data: { token, content } });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "candidate",
          content,
          created_at: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    } catch {
      toast.error("Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="messages" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light font-medium">
          Envoyer un message à {orgName}
        </div>
        <span className="text-[10px] text-grey">
          Distinct de l'assistant IA
        </span>
      </div>

      {messages.length > 0 && (
        <div className="bg-white border border-[rgba(45,38,64,0.08)] rounded-xl overflow-hidden mb-3">
          <div className="p-4 flex flex-col gap-3 max-h-64 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "candidate" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className="max-w-[80%] rounded-xl px-4 py-2.5 text-[12px] leading-relaxed"
                  style={
                    msg.sender === "candidate"
                      ? { background: "#2D2640", color: "#FAF8F5" }
                      : {
                          background: "#F5F2FA",
                          color: "#524970",
                          border: "1px solid rgba(139,127,168,0.15)",
                        }
                  }
                >
                  {msg.content}
                </div>
                <div className="text-[10px] text-grey mt-1 px-1">
                  {msg.sender === "rh" ? orgName : "Vous"} ·{" "}
                  {formatFrDate(msg.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#F5F2FA] border border-[rgba(139,127,168,0.2)] rounded-xl overflow-hidden">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
          placeholder="Une question sur le poste, le processus de recrutement, les modalités…"
          className="w-full bg-transparent p-4 text-[13px] text-aubergine resize-none h-24 placeholder:text-grey outline-none"
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-[10px] text-grey">
            {newMessage.length}/2000
          </span>
          <button
            onClick={handleSend}
            disabled={newMessage.trim().length < 2 || sending}
            className="px-4 py-1.5 bg-[#2D2640] text-[#FAF8F5] rounded-lg text-[12px] font-medium disabled:opacity-40"
          >
            {sending ? "Envoi…" : "Envoyer →"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(45,38,64,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[480px] p-7"
      >
        {children}
      </div>
    </div>
  );
}
