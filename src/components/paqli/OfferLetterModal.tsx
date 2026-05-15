import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  generateOfferLetter,
  sendOfferLetter,
  getOrgLegalStatus,
} from "@/lib/offerLetter.functions";

interface Props {
  linkId: string;
  candidateName: string;
  onClose: () => void;
  onSent?: () => void;
}

export function OfferLetterModal({
  linkId,
  candidateName,
  onClose,
  onSent,
}: Props) {
  const generate = useServerFn(generateOfferLetter);
  const send = useServerFn(sendOfferLetter);
  const checkOrg = useServerFn(getOrgLegalStatus);

  const [step, setStep] = useState<"check" | "preview" | "sent">("check");
  const [orgComplete, setOrgComplete] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [letterId, setLetterId] = useState<string | null>(null);

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

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generate({ data: { linkId } });
      if (!res.success) {
        toast.error(res.message);
        if (res.error === "incomplete_org") {
          setOrgComplete(false);
          setMissing(res.missingFields);
        }
        return;
      }
      setPreviewUrl(res.previewUrl);
      setLetterId(res.letterId);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
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
          <div>
            <h3 className="font-display text-aubergine" style={{ fontSize: 20 }}>
              Promesse d'embauche
            </h3>
            <p className="text-[12px] text-grey mt-0.5">Pour {candidateName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-grey hover:text-aubergine"
            aria-label="Fermer"
          >
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
                      Les champs suivants sont requis pour générer une promesse
                      d'embauche valide :
                    </p>
                    <ul className="space-y-1">
                      {missing.map((f) => (
                        <li
                          key={f}
                          className="text-[12px] text-[#854F0B] font-medium flex items-center gap-2"
                        >
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
                      ✅ Toutes les informations nécessaires sont disponibles.
                      Paqli va pré-remplir la promesse d'embauche à partir des
                      données du package.
                    </p>
                  </div>
                  <div className="border border-[rgba(45,38,64,0.1)] rounded-xl p-4 mb-5 bg-[#F0EBE8]">
                    <p className="text-[11px] text-grey leading-relaxed">
                      ⚠️ La promesse d'embauche générée par Paqli est une base
                      de travail. Faites-la relire par votre service juridique
                      ou un avocat spécialisé en droit social avant envoi.
                      Paqli ne fournit pas de conseil juridique.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Génération…
                      </>
                    ) : (
                      "Générer la promesse →"
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {step === "preview" && previewUrl && (
            <div>
              <div
                className="border border-[rgba(45,38,64,0.1)] rounded-xl overflow-hidden mb-5"
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
                  ⚠️ Vérifiez le document avant envoi. Pensez à le faire
                  relire par votre service juridique.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine-light text-center"
                >
                  Ouvrir en plein écran ↗
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
