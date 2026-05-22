import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/paqli/Button";
import { Chip, TextField, WarnBanner } from "./fields";
import {
  buildCandidateUrl,
  generateCandidateLink,
  publishPackage,
} from "@/lib/candidateLinks";




export function Step5Preview() {
  const { config, saveDraft, setConfig } = usePackageConfig();
  const { organization } = useAuth();
  const navigate = useNavigate();

  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [requireEmail, setRequireEmail] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [customDeadline, setCustomDeadline] = useState(false);

  function setQuickDeadline(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(18, 0, 0, 0);
    setDeadline(d);
    setCustomDeadline(false);
  }

  function fmtDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }


  async function ensureSaved(): Promise<string | null> {
    if (config.packageId) return config.packageId;
    await saveDraft();
    return config.packageId;
  }

  async function handleGenerate() {
    if (!organization) return;
    setGenerating(true);
    try {
      const pkgId = await ensureSaved();
      if (!pkgId) throw new Error("Package non sauvegardé");
      const { token } = await generateCandidateLink(
        pkgId,
        organization.id,
        candidateEmail || undefined,
        [firstName, lastName].filter(Boolean).join(" ") || undefined,
        expiresInDays,
        deadlineEnabled ? deadline : null,
      );
      setGeneratedToken(token);
      if (candidateEmail) {
        toast.message(
          "Lien généré — l'envoi email sera disponible prochainement",
        );
      } else {
        toast.success("Lien généré !");
      }
    } catch (e) {
      console.error(e);
      const err = e as Error & { code?: string; used?: number; quota?: number };
      if (err?.code === "QUOTA_REACHED") {
        toast.error(`Quota mensuel atteint (${err.used}/${err.quota} liens)`, {
          description: "Passez à un plan supérieur pour envoyer plus de liens.",
          action: {
            label: "Voir les plans",
            onClick: () => navigate({ to: "/settings", search: { tab: "plan" as const } }),
          },
          duration: 10000,
        });
      } else {
        toast.error("Erreur lors de la génération du lien");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink() {
    if (!generatedToken) return;
    const url = buildCandidateUrl(generatedToken);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function handlePublish() {
    if (!organization) return;
    setPublishing(true);
    try {
      const pkgId = await ensureSaved();
      if (!pkgId) throw new Error("Package non sauvegardé");
      await publishPackage(pkgId);
      setConfig((prev) => ({ ...prev, status: "active" }));
      toast.success("Package publié !");
      navigate({ to: "/packages/$id", params: { id: pkgId } });
    } catch (e) {
      console.error(e);
      toast.error("Erreur de publication");
    } finally {
      setPublishing(false);
    }
  }

  const url = generatedToken ? buildCandidateUrl(generatedToken) : "";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-aubergine" style={{ fontSize: 18 }}>
          Publier & partager
        </h3>
        <p className="text-[12px] text-grey mt-1">
          Publiez le package et générez un lien personnalisé à envoyer au candidat.
        </p>
      </div>

      <WarnBanner>
        Les montants affichés au candidat sont des estimations indicatives
        (règles fiscales 2026). Ils ne constituent pas un conseil fiscal.

      </WarnBanner>

      {/* Link generation */}
      <div className="rounded-[12px] border border-[rgba(45,38,64,0.08)] bg-white p-5 space-y-4">
        <div
          className="font-display text-aubergine"
          style={{ fontSize: 16 }}
        >
          Lien candidat
        </div>

        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            Expiration
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { v: 30, l: "30 jours" },
              { v: 60, l: "60 jours" },
              { v: 90, l: "90 jours" },
              { v: null, l: "Sans expiration" },
            ].map((o) => (
              <Chip
                key={String(o.v)}
                selected={expiresInDays === o.v}
                onClick={() => setExpiresInDays(o.v)}
              >
                {o.l}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            Protection
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={!requireEmail}
              onClick={() => setRequireEmail(false)}
            >
              Lien ouvert
            </Chip>
            <Chip
              selected={requireEmail}
              onClick={() => setRequireEmail(true)}
            >
              Email requis
            </Chip>
          </div>
        </div>

        {/* Date limite de décision */}
        <div className="border-t border-[rgba(45,38,64,0.06)] pt-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-[12px] text-aubergine-light font-medium">
                Date limite de décision <span className="text-grey">(optionnel)</span>
              </div>
              <div className="text-[11px] text-grey mt-0.5">
                Le candidat verra un compte à rebours sur sa page
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeadlineEnabled((v) => {
                  const next = !v;
                  if (next && !deadline) setQuickDeadline(7);
                  return next;
                });
              }}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                deadlineEnabled ? "bg-[#2D2640]" : "bg-[#D3D1C7]"
              }`}
              aria-pressed={deadlineEnabled}
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ transform: deadlineEnabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {deadlineEnabled && (
            <div className="space-y-3 mt-3">
              <div>
                <div className="text-[11px] text-grey mb-1.5">Délai depuis maintenant</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "3 jours", days: 3 as number | null },
                    { label: "5 jours", days: 5 as number | null },
                    { label: "1 semaine", days: 7 as number | null },
                    { label: "2 semaines", days: 14 as number | null },
                    { label: "Personnalisé", days: null as number | null },
                  ].map((opt) => {
                    const isSelected =
                      opt.days !== null && !customDeadline && deadline
                        ? Math.abs(
                            deadline.getTime() -
                              new Date(new Date().setHours(18, 0, 0, 0) + opt.days * 86400000).getTime(),
                          ) < 60_000
                        : opt.days === null && customDeadline;
                    return (
                      <Chip
                        key={opt.label}
                        selected={isSelected}
                        onClick={() => {
                          if (opt.days !== null) {
                            setQuickDeadline(opt.days);
                          } else {
                            setCustomDeadline(true);
                          }
                        }}
                      >
                        {opt.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              {customDeadline && (
                <div>
                  <div className="text-[11px] text-grey mb-1.5">Date et heure exactes</div>
                  <input
                    type="datetime-local"
                    value={deadline ? fmtDatetimeLocal(deadline) : ""}
                    onChange={(e) => {
                      if (e.target.value) setDeadline(new Date(e.target.value));
                    }}
                    className="w-full h-9 px-3 border border-[rgba(45,38,64,0.12)] rounded-lg text-[13px] text-aubergine outline-none"
                  />
                </div>
              )}

              {deadline && (
                <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "#FAEEDA" }}>
                  <span>📅</span>
                  <div className="text-[12px] text-[#7A5417]">
                    L'offre expire le{" "}
                    <strong>
                      {deadline.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg p-3 bg-[rgba(139,127,168,0.08)]">
                <span>💡</span>
                <div className="text-[11px] text-aubergine-light leading-relaxed">
                  Le candidat verra la date limite sur sa page. Après expiration,
                  l'offre est marquée comme « Expirée » mais la messagerie reste accessible.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-[12px] text-aubergine-light font-medium">
            Envoyer directement par email (optionnel)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              label="Prénom du candidat"
              value={firstName}
              onChange={setFirstName}
            />
            <TextField
              label="Nom du candidat"
              value={lastName}
              onChange={setLastName}
            />
          </div>
          <TextField
            label="Email du candidat"
            value={candidateEmail}
            onChange={setCandidateEmail}
            placeholder="prenom.nom@email.com"
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Génération…" : "Générer et envoyer →"}
        </Button>

        {generatedToken && (
          <div className="rounded-md border border-[rgba(45,38,64,0.1)] bg-[#FAF8F5] p-3 flex items-stretch gap-2">
            <div className="flex-1 px-3 py-2 bg-white rounded text-[12px] text-aubergine truncate font-mono">
              {url}
            </div>
            <Button variant="ghost" onClick={copyLink}>
              📋 Copier
            </Button>
          </div>
        )}
        <div className="text-[11px] text-grey leading-relaxed">
          Le candidat renseigne sa situation → Paqli calcule une estimation
          personnalisée.
        </div>
      </div>

      {/* Publish */}
      <Button
        onClick={handlePublish}
        disabled={publishing || config.status === "active"}
        className="w-full"
      >
        {config.status === "active"
          ? "Package publié"
          : publishing
            ? "Publication…"
            : "Publier le package"}
      </Button>
    </div>
  );
}

