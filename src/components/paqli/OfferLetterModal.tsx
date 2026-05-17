import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, X, ArrowLeft } from "lucide-react";
import {
  generateOfferLetter,
  sendOfferLetter,
  getOrgLegalStatus,
  getOfferLetterDraft,
  type OfferLetterEdits,
} from "@/lib/offerLetter.functions";

interface Props {
  linkId: string;
  candidateName: string;
  onClose: () => void;
  onSent?: () => void;
}

interface FormState {
  jobTitle: string;
  grossSalary: string;
  variableTarget: string;
  startDate: string;
  trialPeriodMonths: string;
  trialPeriodRenewable: boolean;
  locationCity: string;
  locationDetails: string;
  remotePolicy: "full_remote" | "hybrid" | "office_first" | "on_site";
  remoteDays: string;
  remoteGuaranteed: boolean;
  additionalClauses: string;
  rhName: string;
}

const REMOTE_OPTIONS: Array<{ value: FormState["remotePolicy"]; label: string }> = [
  { value: "on_site", label: "Présentiel complet" },
  { value: "office_first", label: "Majoritairement présentiel" },
  { value: "hybrid", label: "Hybride" },
  { value: "full_remote", label: "Full remote" },
];

export function OfferLetterModal({ linkId, candidateName, onClose, onSent }: Props) {
  const generate = useServerFn(generateOfferLetter);
  const send = useServerFn(sendOfferLetter);
  const checkOrg = useServerFn(getOrgLegalStatus);
  const loadDraft = useServerFn(getOfferLetterDraft);

  const [step, setStep] = useState<"check" | "edit" | "preview" | "sent">("check");
  const [orgComplete, setOrgComplete] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    checkOrg({})
      .then((r) => {
        setOrgComplete(r.complete);
        setMissing(r.missing);
      })
      .catch(() => {
        setOrgComplete(false);
        setMissing(["SIRET", "Adresse", "Ville"]);
      });
  }, [checkOrg]);

  async function enterEditStep() {
    setLoadingDefaults(true);
    try {
      const res = await loadDraft({ data: { linkId } });
      if (!res.ok) {
        toast.error("Impossible de charger les données du package");
        return;
      }
      const d = res.defaults;
      const e = (res.existing?.edits ?? {}) as OfferLetterEdits;
      setForm({
        jobTitle: (e.jobTitle ?? d.jobTitle) || "",
        grossSalary: String(e.grossSalary ?? d.grossSalary ?? ""),
        variableTarget:
          e.variableTarget !== undefined
            ? e.variableTarget === null
              ? ""
              : String(e.variableTarget)
            : d.variableTarget !== null && d.variableTarget !== undefined
              ? String(d.variableTarget)
              : "",
        startDate: (e.startDate ?? d.startDate) ?? "",
        trialPeriodMonths:
          e.trialPeriodMonths !== undefined
            ? e.trialPeriodMonths === null
              ? ""
              : String(e.trialPeriodMonths)
            : d.trialPeriodMonths !== null && d.trialPeriodMonths !== undefined
              ? String(d.trialPeriodMonths)
              : "",
        trialPeriodRenewable: e.trialPeriodRenewable ?? d.trialPeriodRenewable ?? false,
        locationCity: (e.locationCity ?? d.locationCity) || "",
        locationDetails: (e.locationDetails ?? d.locationDetails) ?? "",
        remotePolicy: (e.remotePolicy ?? d.remotePolicy ?? "hybrid") as FormState["remotePolicy"],
        remoteDays:
          e.remoteDays !== undefined
            ? e.remoteDays === null
              ? ""
              : String(e.remoteDays)
            : d.remoteDays !== null && d.remoteDays !== undefined
              ? String(d.remoteDays)
              : "",
        remoteGuaranteed: e.remoteGuaranteed ?? d.remoteGuaranteed ?? false,
        additionalClauses: (e.additionalClauses ?? d.additionalClauses) ?? "",
        rhName: (e.rhName ?? d.rhName) || "",
      });
      setStep("edit");
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingDefaults(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleGenerate() {
    if (!form) return;
    const grossSalary = Number(form.grossSalary);
    if (!grossSalary || grossSalary <= 0) {
      toast.error("Le salaire fixe est requis");
      return;
    }
    const edits: OfferLetterEdits = {
      jobTitle: form.jobTitle.trim() || undefined,
      grossSalary,
      variableTarget: form.variableTarget.trim() === "" ? null : Number(form.variableTarget),
      startDate: form.startDate.trim() === "" ? null : form.startDate.trim(),
      trialPeriodMonths:
        form.trialPeriodMonths.trim() === "" ? null : Number(form.trialPeriodMonths),
      trialPeriodRenewable: form.trialPeriodRenewable,
      locationCity: form.locationCity.trim(),
      locationDetails: form.locationDetails.trim() === "" ? null : form.locationDetails.trim(),
      remotePolicy: form.remotePolicy,
      remoteDays:
        form.remotePolicy === "hybrid" && form.remoteDays.trim() !== ""
          ? Number(form.remoteDays)
          : null,
      remoteGuaranteed: form.remoteGuaranteed,
      additionalClauses:
        form.additionalClauses.trim() === "" ? null : form.additionalClauses.trim(),
      rhName: form.rhName.trim() || undefined,
    };

    setGenerating(true);
    try {
      const res = await generate({ data: { linkId, edits } });
      if (!res.success) {
        toast.error(res.message);
        if (res.error === "incomplete_org") {
          setOrgComplete(false);
          setMissing(res.missingFields);
          setStep("check");
        }
        return;
      }
      setPreviewUrl(res.previewUrl);
      setLetterId(res.letterId);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!letterId) return;
    setSending(true);
    try {
      await send({ data: { letterId } });
      setStep("sent");
      onSent?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-aubergine/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[rgba(45,38,64,0.06)]">
          <div className="flex items-center gap-3">
            {step === "preview" && (
              <button
                onClick={() => setStep("edit")}
                className="text-grey hover:text-aubergine"
                aria-label="Retour à l'édition"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="font-display text-aubergine" style={{ fontSize: 20 }}>
                Promesse d'embauche
              </h3>
              <p className="text-[12px] text-grey mt-0.5">
                Pour {candidateName}
                {step === "edit" && " · Étape 1/2 — Ajuster"}
                {step === "preview" && " · Étape 2/2 — Vérifier & envoyer"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-grey hover:text-aubergine" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === "check" && (
            <>
              {orgComplete === null ? (
                <div className="flex items-center gap-2 text-[13px] text-grey py-6 justify-center">
                  <Loader2 size={14} className="animate-spin" /> Vérification…
                </div>
              ) : !orgComplete ? (
                <div>
                  <div className="bg-[#FAEEDA] border border-[rgba(196,168,130,0.3)] rounded-xl p-4 mb-5">
                    <div className="text-[13px] font-medium text-[#633806] mb-2">
                      ⚠️ Informations entreprise incomplètes
                    </div>
                    <p className="text-[12px] text-[#854F0B] leading-relaxed mb-3">
                      Les champs suivants sont requis pour générer une promesse d'embauche valide :
                    </p>
                    <ul className="space-y-1">
                      {missing.map((f) => (
                        <li key={f} className="text-[12px] text-[#854F0B] font-medium">
                          → {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href="/settings"
                    className="block text-center px-4 py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium"
                  >
                    Compléter les paramètres entreprise →
                  </a>
                </div>
              ) : (
                <div>
                  <div className="bg-[#EAF3DE] border border-[rgba(59,109,17,0.15)] rounded-xl p-4 mb-5">
                    <p className="text-[12px] text-[#3B6D11] leading-relaxed">
                      ✅ Informations disponibles. Paqli va pré-remplir un formulaire à partir des
                      données du package. Vous pourrez ajuster chaque champ avant de générer le PDF.
                    </p>
                  </div>
                  <div className="border border-[rgba(45,38,64,0.1)] rounded-xl p-4 mb-5 bg-[#F0EBE8]">
                    <p className="text-[11px] text-grey leading-relaxed">
                      ⚠️ La promesse générée par Paqli est une base de travail. Faites-la relire
                      par votre service juridique avant envoi. Paqli ne fournit pas de conseil
                      juridique.
                    </p>
                  </div>
                  <button
                    onClick={enterEditStep}
                    disabled={loadingDefaults}
                    className="w-full py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingDefaults ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Chargement…
                      </>
                    ) : (
                      "Préparer la promesse →"
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {step === "edit" && form && (
            <div className="space-y-5">
              <Field label="Intitulé du poste">
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Salaire fixe brut annuel (€)">
                  <input
                    type="number"
                    min={0}
                    value={form.grossSalary}
                    onChange={(e) => update("grossSalary", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Variable cible annuel (€)">
                  <input
                    type="number"
                    min={0}
                    value={form.variableTarget}
                    onChange={(e) => update("variableTarget", e.target.value)}
                    className={inputCls}
                    placeholder="Laisser vide si aucun"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de prise de poste">
                  <input
                    type="text"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className={inputCls}
                    placeholder="Ex. 1er septembre 2026"
                  />
                </Field>
                <Field label="Période d'essai (mois)">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={form.trialPeriodMonths}
                    onChange={(e) => update("trialPeriodMonths", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-aubergine-light cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.trialPeriodRenewable}
                  onChange={(e) => update("trialPeriodRenewable", e.target.checked)}
                />
                Période d'essai renouvelable
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville">
                  <input
                    type="text"
                    value={form.locationCity}
                    onChange={(e) => update("locationCity", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Adresse / précisions">
                  <input
                    type="text"
                    value={form.locationDetails}
                    onChange={(e) => update("locationDetails", e.target.value)}
                    className={inputCls}
                    placeholder="Optionnel"
                  />
                </Field>
              </div>

              <Field label="Modalités de télétravail">
                <select
                  value={form.remotePolicy}
                  onChange={(e) => update("remotePolicy", e.target.value as FormState["remotePolicy"])}
                  className={inputCls}
                >
                  {REMOTE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              {form.remotePolicy === "hybrid" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jours de télétravail / semaine">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={form.remoteDays}
                      onChange={(e) => update("remoteDays", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-[12px] text-aubergine-light cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.remoteGuaranteed}
                      onChange={(e) => update("remoteGuaranteed", e.target.checked)}
                    />
                    Mentionné au contrat
                  </label>
                </div>
              )}

              <Field label="Clauses additionnelles (optionnel)">
                <textarea
                  value={form.additionalClauses}
                  onChange={(e) => update("additionalClauses", e.target.value)}
                  className={`${inputCls} min-h-[100px] resize-y`}
                  placeholder="Ex. prime de signature, clauses spécifiques, dispositions particulières…"
                />
              </Field>

              <Field label="Signataire RH">
                <input
                  type="text"
                  value={form.rhName}
                  onChange={(e) => update("rhName", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("check")}
                  className="px-4 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Génération du PDF…
                    </>
                  ) : (
                    "Générer le PDF →"
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "preview" && previewUrl && (
            <div>
              <div
                className="border border-[rgba(45,38,64,0.1)] rounded-xl overflow-hidden mb-5 bg-[#F0EBE8]"
                style={{ height: "500px" }}
              >
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Prévisualisation promesse d'embauche"
                />
              </div>
              <div className="bg-[#F0EBE8] rounded-xl px-4 py-3 mb-5">
                <p className="text-[11px] text-grey leading-relaxed">
                  ⚠️ Vérifiez le document avant envoi. Si besoin, revenez en arrière pour ajuster
                  un champ puis régénérez le PDF.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("edit")}
                  className="px-4 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light"
                >
                  ← Modifier
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light text-center"
                >
                  Plein écran ↗
                </a>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium disabled:opacity-50"
                >
                  {sending ? "Envoi…" : `Envoyer à ${candidateName} →`}
                </button>
              </div>
            </div>
          )}

          {step === "sent" && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <div className="font-display text-aubergine mb-2" style={{ fontSize: 20 }}>
                Promesse d'embauche envoyée
              </div>
              <p className="text-[13px] text-grey">
                {candidateName} a reçu la promesse d'embauche par email.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine bg-white focus:outline-none focus:border-aubergine";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-grey mb-1.5">{label}</div>
      {children}
    </div>
  );
}
