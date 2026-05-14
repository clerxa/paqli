import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { sendCounterOffer } from "@/lib/sendCounterOffer.functions";
import { DECLINE_LABELS } from "@/hooks/useLinkActivity";

export interface CounterOfferOriginal {
  linkId: string;
  candidateName: string;
  declineCategory: string | null;
  declineReason: string | null;
  packageTitle: string;
  grossSalary: number;
  variableTarget: number | null;
  remotePolicy: string | null;
  remoteDays: number | null;
  bspceQuantity: number | null;
}

interface Props {
  original: CounterOfferOriginal;
  onClose: () => void;
  onSent?: (info: { newToken: string; counterOfferId: string }) => void;
}

export function CounterOfferModal({ original, onClose, onSent }: Props) {
  const send = useServerFn(sendCounterOffer);
  const [grossSalary, setGrossSalary] = useState(original.grossSalary);
  const [variableTarget, setVariableTarget] = useState(
    original.variableTarget ?? 0,
  );
  const [remoteDays, setRemoteDays] = useState<number | null>(
    original.remoteDays,
  );
  const [bspce, setBspce] = useState<number | null>(original.bspceQuantity);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const deltas = useMemo(
    () => ({
      salary: grossSalary - original.grossSalary,
      variable: variableTarget - (original.variableTarget ?? 0),
      remote: (remoteDays ?? 0) - (original.remoteDays ?? 0),
      bspce: (bspce ?? 0) - (original.bspceQuantity ?? 0),
    }),
    [grossSalary, variableTarget, remoteDays, bspce, original],
  );

  const hasChanges =
    deltas.salary !== 0 ||
    deltas.variable !== 0 ||
    deltas.remote !== 0 ||
    deltas.bspce !== 0;

  async function submit() {
    if (!hasChanges) {
      toast.error("Modifiez au moins un élément du package");
      return;
    }
    setSending(true);
    try {
      const res = await send({
        data: {
          originalLinkId: original.linkId,
          changes: {
            grossSalary:
              deltas.salary !== 0 ? grossSalary : null,
            variableTarget:
              deltas.variable !== 0 ? variableTarget : null,
            remoteDays: deltas.remote !== 0 ? remoteDays : null,
            equityQuantity: deltas.bspce !== 0 ? bspce : null,
            peeMatchingRate: null,
          },
          message: message.trim() || null,
        },
      });
      toast.success("Contre-offre envoyée");
      onSent?.({ newToken: res.newToken, counterOfferId: res.counterOfferId });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(45,38,64,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-aubergine" style={{ fontSize: 20 }}>
            Contre-offre pour {original.candidateName}
          </h3>
          <button onClick={onClose} className="text-grey text-xl leading-none">
            ×
          </button>
        </div>

        {original.declineCategory && (
          <div className="bg-[#FCEBEB] rounded-xl p-3 mb-5">
            <div className="text-[12px] font-medium text-[#A32D2D] mb-1">
              Raison du refus
            </div>
            <div className="text-[12px] text-[#A32D2D] font-light">
              {DECLINE_LABELS[original.declineCategory] ?? original.declineCategory}
              {original.declineReason && (
                <span className="block mt-1 italic">
                  « {original.declineReason} »
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-5">
          {/* Fixe */}
          <SliderRow
            label="Salaire brut annuel"
            min={Math.round(original.grossSalary * 0.9)}
            max={Math.round(original.grossSalary * 1.3)}
            step={1000}
            value={grossSalary}
            delta={deltas.salary}
            format={(v) => `${v.toLocaleString("fr-FR")} €`}
            onChange={setGrossSalary}
          />

          {/* Variable */}
          <SliderRow
            label="Variable cible annuel"
            min={0}
            max={(original.variableTarget ?? 0) * 2 + 5000}
            step={500}
            value={variableTarget}
            delta={deltas.variable}
            format={(v) => `${v.toLocaleString("fr-FR")} €`}
            onChange={setVariableTarget}
          />

          {/* Télétravail */}
          {original.remotePolicy === "hybrid" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-aubergine-light">
                  Jours de télétravail / semaine
                </label>
                {deltas.remote !== 0 && (
                  <span className="text-[11px] font-medium text-[#3B6D11]">
                    {deltas.remote > 0 ? "+" : ""}
                    {deltas.remote} jour{Math.abs(deltas.remote) > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRemoteDays(d)}
                    className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                      remoteDays === d
                        ? "bg-[#2D2640] text-[#FAF8F5] border-[#2D2640]"
                        : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)]"
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BSPCE */}
          {(original.bspceQuantity ?? 0) > 0 && (
            <SliderRow
              label="Nombre de BSPCE"
              min={original.bspceQuantity!}
              max={Math.round(original.bspceQuantity! * 1.5)}
              step={500}
              value={bspce ?? original.bspceQuantity!}
              delta={deltas.bspce}
              format={(v) => `${v.toLocaleString("fr-FR")} bons`}
              onChange={setBspce}
            />
          )}
        </div>

        {/* Message */}
        <div className="mb-5">
          <label className="text-[12px] font-medium text-aubergine-light block mb-1.5">
            Message accompagnant la contre-offre
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="Bonjour, suite à notre échange, nous avons revu notre proposition…"
            className="w-full border border-[rgba(45,38,64,0.12)] rounded-lg p-3 text-[13px] text-aubergine resize-none h-24 font-light outline-none"
          />
          <div className="text-[10px] text-[#B8AECF] text-right mt-1">
            {message.length}/500
          </div>
        </div>

        {/* Résumé */}
        <div className="bg-[#F0EBE8] rounded-xl p-4 mb-5">
          <div className="text-[11px] font-semibold text-grey uppercase tracking-wide mb-3">
            Résumé des modifications
          </div>
          <div className="space-y-1.5">
            {deltas.salary !== 0 && (
              <SummaryRow
                label="Fixe"
                from={`${original.grossSalary.toLocaleString("fr-FR")} €`}
                to={`${grossSalary.toLocaleString("fr-FR")} €`}
                delta={`${deltas.salary > 0 ? "+" : ""}${deltas.salary.toLocaleString("fr-FR")} €`}
                positive={deltas.salary > 0}
              />
            )}
            {deltas.variable !== 0 && (
              <SummaryRow
                label="Variable"
                from={`${(original.variableTarget ?? 0).toLocaleString("fr-FR")} €`}
                to={`${variableTarget.toLocaleString("fr-FR")} €`}
                delta={`${deltas.variable > 0 ? "+" : ""}${deltas.variable.toLocaleString("fr-FR")} €`}
                positive={deltas.variable > 0}
              />
            )}
            {deltas.remote !== 0 && (
              <SummaryRow
                label="Télétravail"
                from={`${original.remoteDays ?? 0}j`}
                to={`${remoteDays ?? 0}j`}
                delta={`${deltas.remote > 0 ? "+" : ""}${deltas.remote}j`}
                positive={deltas.remote > 0}
              />
            )}
            {deltas.bspce !== 0 && (
              <SummaryRow
                label="BSPCE"
                from={`${(original.bspceQuantity ?? 0).toLocaleString("fr-FR")}`}
                to={`${(bspce ?? 0).toLocaleString("fr-FR")}`}
                delta={`${deltas.bspce > 0 ? "+" : ""}${deltas.bspce.toLocaleString("fr-FR")}`}
                positive={deltas.bspce > 0}
              />
            )}
            {!hasChanges && (
              <div className="text-[12px] text-grey italic">
                Aucune modification — ajustez les curseurs ci-dessus
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={sending || !hasChanges}
            className="flex-1 py-2.5 bg-[#2D2640] text-[#FAF8F5] rounded-lg text-[13px] font-medium disabled:opacity-40"
          >
            {sending ? "Envoi…" : "Envoyer la contre-offre →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  delta,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  delta: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-medium text-aubergine-light">
          {label}
        </label>
        {delta !== 0 && (
          <span
            className={`text-[11px] font-medium ${
              delta > 0 ? "text-[#3B6D11]" : "text-[#B85A6A]"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString("fr-FR")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-[#2D2640]"
        />
        <span className="text-[14px] font-medium text-aubergine w-28 text-right">
          {format(value)}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  from,
  to,
  delta,
  positive,
}: {
  label: string;
  from: string;
  to: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-grey">{label}</span>
      <span className="text-aubergine">
        {from} → <strong>{to}</strong>{" "}
        <span className={positive ? "text-[#3B6D11]" : "text-[#B85A6A]"}>
          ({delta})
        </span>
      </span>
    </div>
  );
}
