import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateOfferStatus } from "@/lib/updateOfferStatus.functions";
import { sendCandidateMessage } from "@/lib/sendMessage.functions";
import type {
  CandidateLinkData,
  PublicMessage,
} from "@/hooks/useCandidateLink";
import type { PackageEstimate, PackageData } from "@/lib/clientCalc";
import { formatEur } from "@/lib/clientCalc";

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
  pkg,
  estimate,
  onStatusChange,
  onThinkingUpdate,
}: {
  data: CandidateLinkData;
  orgName: string;
  pkgTitle: string;
  pkg: PackageData;
  estimate: PackageEstimate;
  onStatusChange: (status: string, statusUpdatedAt: string) => void;
  onThinkingUpdate?: (note: string | null, at: string | null) => void;
}) {
  const [showAccept, setShowAccept] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [declineCategory, setDeclineCategory] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [thinkingNote, setThinkingNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = useServerFn(updateOfferStatus);

  // Allow external triggers (e.g. MobileFloatingCTA) to open modals
  useEffect(() => {
    const onOpenAccept = () => setShowAccept(true);
    const onOpenThinking = () => setShowThinking(true);
    window.addEventListener("paqli:open-accept", onOpenAccept);
    window.addEventListener("paqli:open-thinking", onOpenThinking);
    return () => {
      window.removeEventListener("paqli:open-accept", onOpenAccept);
      window.removeEventListener("paqli:open-thinking", onOpenThinking);
    };
  }, []);

  const status = data.offerStatus;
  const statusUpdatedAt = data.statusUpdatedAt;
  const firstName = data.candidate_name
    ? (data.candidate_name.trim().split(/\s+/)[0] ?? null)
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

  async function handleThinking() {
    setSubmitting(true);
    try {
      const res = await update({
        data: {
          token: data.token,
          status: "thinking",
          thinkingNote: thinkingNote || null,
        },
      });
      onStatusChange("thinking", res.statusUpdatedAt);
      onThinkingUpdate?.(res.thinkingNote ?? null, res.thinkingAt ?? null);
      setShowThinking(false);
      setThinkingNote("");
      toast.success("Votre intérêt a été signalé à " + orgName + ".");
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
          <p className="text-[12px] text-aubergine-light leading-relaxed mb-4 font-light">
            Indiquez votre position à <strong>{orgName}</strong>. Vous pouvez
            modifier votre décision à tout moment.
          </p>

          <button
            onClick={() => setShowAccept(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#EAF3DE] text-[#27500A] border border-[rgba(59,109,17,0.2)] rounded-xl py-3 mb-2 text-[13px] font-medium hover:bg-[#D5EBC0] transition-colors"
          >
            ✅ Accepter l'offre {orgName}
          </button>

          <button
            onClick={() => setShowThinking(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#F5F2FA] text-[#6B5F88] border border-[rgba(139,127,168,0.2)] rounded-xl py-3 mb-2 text-[13px] font-medium hover:bg-[#EDE9F5] transition-colors"
          >
            💭 Je suis intéressé·e — j'ai besoin de réfléchir
          </button>

          <button
            onClick={() => setShowDecline(true)}
            className="w-full flex items-center justify-center gap-2 text-[#9B97A0] text-[12px] font-light hover:text-[#524970] transition-colors py-2"
          >
            Cette offre ne correspond pas à mes attentes
          </button>
        </div>
      )}

      {status === "thinking" && (
        <div className="bg-[#F5F2FA] border border-[rgba(139,127,168,0.2)] rounded-xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl">💭</span>
            <div>
              <div className="text-[14px] font-medium text-aubergine">
                {firstName
                  ? `${firstName}, votre intérêt est signalé`
                  : "Vous avez signalé votre intérêt"}
              </div>
              <div className="text-[11px] text-aubergine-light font-light mt-0.5">
                {orgName} sait que vous réfléchissez à cette offre.
                {statusUpdatedAt && ` Depuis le ${formatFrDate(statusUpdatedAt)}.`}
              </div>
            </div>
          </div>

          {data.thinkingNote && (
            <div className="bg-white rounded-lg px-3 py-2.5 mb-3 border border-[rgba(139,127,168,0.15)]">
              <p className="text-[11px] text-[#524970] font-light italic">
                « {data.thinkingNote} »
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowAccept(true)}
              className="flex-1 py-2 bg-aubergine text-white rounded-lg text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              ✅ Accepter l'offre
            </button>
            <button
              onClick={() => setShowDecline(true)}
              className="px-3 py-2 border border-[rgba(45,38,64,0.12)] rounded-lg text-[11px] text-[#9B97A0] hover:text-[#524970] transition-colors"
            >
              Décliner
            </button>
          </div>

          <p className="text-[10px] text-grey text-center mt-2 font-light">
            Vous pouvez changer de décision à tout moment
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

      {/* Accept modal with package recap */}
      {showAccept && (
        <Modal onClose={() => setShowAccept(false)}>
          <div className="text-center mb-3" style={{ fontSize: 28 }}>
            ✅
          </div>
          <h3
            className="font-display text-aubergine text-center mb-1"
            style={{ fontSize: 20 }}
          >
            Accepter l'offre {orgName}
          </h3>
          <p className="text-[12px] text-grey font-light text-center mb-4">
            {firstName ? `${firstName}, voici` : "Voici"} ce que vous acceptez
            pour le poste de{" "}
            <strong className="text-[#524970]">{pkgTitle}</strong>
          </p>

          <div className="bg-[#F5F0EC] rounded-xl p-4 mb-4">
            <div className="text-[10px] font-semibold text-grey uppercase tracking-wide mb-3">
              Ce que vous acceptez
            </div>
            <div className="space-y-3">
              {buildTopFigures(pkg, estimate).map((figure, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-aubergine">
                      {figure.label}
                    </div>
                    {figure.sublabel && (
                      <div className="text-[10px] text-grey font-light">
                        {figure.sublabel}
                      </div>
                    )}
                  </div>
                  <div
                    className="font-display whitespace-nowrap"
                    style={{ fontSize: 18, color: figure.color }}
                  >
                    {figure.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-aubergine rounded-xl px-4 py-3 mb-4">
            <span className="text-[11px] text-[#B8AECF]">
              Total Compensation hors equity
            </span>
            <span
              className="font-display text-white whitespace-nowrap"
              style={{ fontSize: 18 }}
            >
              ~{formatEur(totalCompHorsEquity(estimate))}
            </span>
          </div>

          <p className="text-[11px] text-grey font-light text-center mb-4 leading-relaxed">
            L'équipe RH de {orgName} sera notifiée immédiatement. Vous
            recevrez la promesse d'embauche par email.
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
              {submitting ? "Confirmation…" : "Confirmer mon acceptation ✅"}
            </button>
          </div>

          <p className="text-[10px] text-[#B8AECF] text-center mt-3 font-light">
            Ces montants sont des estimations — règles fiscales 2026
          </p>
        </Modal>
      )}

      {/* Thinking modal */}
      {showThinking && (
        <Modal onClose={() => setShowThinking(false)}>
          <div className="text-center mb-3" style={{ fontSize: 28 }}>
            💭
          </div>
          <h3
            className="font-display text-aubergine text-center mb-2"
            style={{ fontSize: 20 }}
          >
            Vous êtes intéressé·e
          </h3>
          <p className="text-[13px] text-aubergine-light font-light leading-relaxed text-center mb-5">
            En indiquant que vous réfléchissez, vous signalez votre intérêt à{" "}
            <strong>{orgName}</strong> sans vous engager. Ils pourront vous
            recontacter si nécessaire.
          </p>

          <div className="mb-4">
            <label className="text-[11px] font-medium text-[#524970] block mb-1.5">
              Message pour {orgName}
              <span className="text-grey font-normal ml-1">(optionnel)</span>
            </label>
            <textarea
              value={thinkingNote}
              onChange={(e) => setThinkingNote(e.target.value.slice(0, 300))}
              placeholder="Ex : Je suis très intéressé·e mais j'attends d'avoir toutes les informations avant de décider."
              className="w-full border border-[rgba(45,38,64,0.12)] rounded-xl p-3 text-[12px] text-aubergine font-light resize-none h-20 outline-none focus:border-[#8B7FA8] placeholder:text-grey"
            />
            <div className="text-[10px] text-grey text-right mt-1">
              {thinkingNote.length}/300
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowThinking(false)}
              className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-xl text-[13px] text-[#524970]"
            >
              Annuler
            </button>
            <button
              onClick={handleThinking}
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#8B7FA8] text-white rounded-xl text-[13px] font-medium disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Signaler mon intérêt"}
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

/* -------- Helpers for the acceptance recap -------- */

interface TopFigure {
  label: string;
  sublabel?: string;
  value: string;
  color: string;
}

function totalCompHorsEquity(estimate: PackageEstimate): number {
  return (
    (estimate.salaryEst ?? 0) +
    (estimate.variableEst ?? 0) +
    (estimate.benefitsEst ?? 0) +
    (estimate.peeEst ?? 0) +
    (estimate.interEst ?? 0) +
    (estimate.participationEst ?? 0)
  );
}

function buildTopFigures(
  pkg: PackageData,
  estimate: PackageEstimate,
): TopFigure[] {
  const figures: TopFigure[] = [];

  if (estimate.salaryEst > 0) {
    figures.push({
      label: "Fixe net mensuel estimé",
      sublabel: pkg.gross_salary
        ? `${Number(pkg.gross_salary).toLocaleString("fr-FR")} € bruts annuels`
        : undefined,
      value: `~${formatEur(Math.round(estimate.salaryEst / 12))}`,
      color: "#2D2640",
    });
  }

  const realiste = estimate.equityByScenario?.find(
    (s) => s.label?.toLowerCase() === "realiste" || s.label?.toLowerCase() === "réaliste",
  );
  const realisteEquity = realiste?.estimateHighSeniority ?? 0;
  if (realisteEquity > 0) {
    const deviceType =
      (pkg.equity_devices?.[0] as any)?.type?.toUpperCase() ?? "Equity";
    figures.push({
      label: `${deviceType} — scénario réaliste`,
      sublabel: "Si ≥ 3 ans d'ancienneté",
      value: `~${formatEur(realisteEquity)}`,
      color: "#8B7FA8",
    });
  }

  const peeVal = estimate.peeEst ?? 0;
  const varVal = estimate.variableEst ?? 0;
  const benefitsVal = estimate.benefitsEst ?? 0;

  if (peeVal > 0 && peeVal >= varVal) {
    figures.push({
      label: "Abondement PEE employeur",
      sublabel: "Si vous versez au maximum",
      value: `~${formatEur(peeVal)}`,
      color: "#C4A882",
    });
  } else if (varVal > 0) {
    figures.push({
      label: "Variable cible annuel",
      sublabel: "Si objectifs à 100%",
      value: `~${formatEur(varVal)}`,
      color: "#C4A882",
    });
  } else if (benefitsVal > 0) {
    figures.push({
      label: "Avantages valorisés",
      sublabel: "Ce que vous n'avancez pas",
      value: `~${formatEur(benefitsVal)}`,
      color: "#3B6D11",
    });
  }

  return figures.slice(0, 3);
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
