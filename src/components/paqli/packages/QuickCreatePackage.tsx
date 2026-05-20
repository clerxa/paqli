import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { useAuth } from "@/hooks/useAuth";
import { useJobs } from "@/hooks/useJobs";
import { usePackages, duplicatePackage } from "@/hooks/usePackages";
import { applyJobToConfig, getJob } from "@/lib/jobsService";
import { type PackageConfig } from "@/lib/packageConfig";
import { upsertPackage } from "@/lib/packageService";
import { loadOrgDefaultsConfig } from "@/lib/orgDefaults";
import {
  Briefcase,
  Copy,
  FilePlus,
  ChevronRight,
  Sparkles,
  Check,
} from "lucide-react";

type Mode = "job" | "duplicate" | "scratch";

export function QuickCreatePackage() {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const { jobs, loading: jobsLoading } = useJobs();
  const { packages, loading: pkgsLoading } = usePackages("all");

  const recentPackages = useMemo(
    () => packages.filter((p) => p.status !== "archived").slice(0, 50),
    [packages],
  );

  const [mode, setMode] = useState<Mode>(() => "job");
  const [jobId, setJobId] = useState<string>("");
  const [duplicateId, setDuplicateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [grossSalary, setGrossSalary] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Org defaults (benefits, equity, savings, company_profile)
  const [defaults, setDefaults] = useState<{
    config: PackageConfig | null;
    prefilled: {
      benefits: number;
      equity: number;
      savings: number;
      companyProfile: boolean;
    };
    loading: boolean;
  }>({
    config: null,
    prefilled: { benefits: 0, equity: 0, savings: 0, companyProfile: false },
    loading: true,
  });

  useEffect(() => {
    if (!organization?.id) return;
    let active = true;
    loadOrgDefaultsConfig(organization.id)
      .then((res) => {
        if (!active) return;
        setDefaults({ config: res.config, prefilled: res.prefilled, loading: false });
      })
      .catch((e) => {
        console.error("loadOrgDefaultsConfig", e);
        if (active) setDefaults((d) => ({ ...d, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [organization?.id]);

  // Auto-pick the first job/package when switching mode
  useEffect(() => {
    if (mode === "job" && !jobId && jobs.length > 0) {
      setJobId(jobs[0].id);
      if (!title) setTitle(jobs[0].title);
    }
    if (mode === "duplicate" && !duplicateId && recentPackages.length > 0) {
      setDuplicateId(recentPackages[0].id);
    }
  }, [mode, jobs, recentPackages, jobId, duplicateId, title]);

  // When user changes the selected job, sync the title
  useEffect(() => {
    if (mode !== "job" || !jobId) return;
    const j = jobs.find((x) => x.id === jobId);
    if (j) setTitle(j.title);
  }, [jobId, mode, jobs]);

  const canSubmit =
    !submitting &&
    !!user &&
    !!organization &&
    (mode === "duplicate"
      ? !!duplicateId
      : title.trim().length >= 3);

  async function handleCreate() {
    if (!user || !organization) return;
    setSubmitting(true);
    try {
      const salary = parseInt(grossSalary.replace(/[^\d]/g, ""), 10);

      if (mode === "duplicate") {
        const newId = await duplicatePackage(duplicateId);
        toast.success("Package dupliqué — édition prête");
        navigate({
          to: "/packages/$id/edit",
          params: { id: newId },
        });
        return;
      }

      // Start from org defaults (benefits, equity, savings, company profile)
      // — falls back to fresh load if the in-state copy isn't ready yet.
      const base =
        defaults.config ??
        (await loadOrgDefaultsConfig(organization.id)).config;
      let cfg: PackageConfig = { ...base, status: "draft" };

      if (mode === "job" && jobId) {
        const job = await getJob(jobId);
        if (job) cfg = applyJobToConfig(cfg, job);
      }

      cfg = {
        ...cfg,
        title: title.trim() || cfg.title || "Nouveau package",
        grossSalary: Number.isFinite(salary) && salary > 0 ? salary : cfg.grossSalary,
        startDate: startDate || cfg.startDate,
      };

      const id = await upsertPackage(cfg, organization.id, user.id);
      toast.success(
        mode === "job"
          ? "Package créé depuis l'offre — éditez les détails"
          : "Package créé — éditez les détails",
      );
      navigate({ to: "/packages/$id/edit", params: { id } });
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  function goExpert() {
    // Full configurator from scratch (existing flow)
    navigate({ to: "/packages/new", search: { expert: "1" } as never });
  }

  const hasJobs = jobs.length > 0;
  const hasPackages = recentPackages.length > 0;

  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/packages" className="hover:text-aubergine">
              Packages
            </Link>
            <span className="mx-2">/</span>
            <span
              className="text-aubergine font-display"
              style={{ fontSize: 22 }}
            >
              Nouveau package
            </span>
          </span>
        }
        actions={
          <button
            type="button"
            onClick={goExpert}
            className="text-[12px] text-aubergine-light hover:text-aubergine underline-offset-2 hover:underline"
          >
            Mode expert →
          </button>
        }
      />

      <div className="px-4 sm:px-7 py-6 max-w-3xl mx-auto space-y-5">
        <div>
          <h1
            className="font-display text-aubergine"
            style={{ fontSize: 26, lineHeight: 1.15 }}
          >
            Créer un package en quelques secondes
          </h1>
          <p className="text-[13px] text-grey mt-1.5">
            Choisissez une base, ajustez 2-3 infos. Vous pourrez tout
            personnaliser ensuite dans l'éditeur.
          </p>
        </div>

        {/* Mode picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ModeCard
            active={mode === "job"}
            disabled={!hasJobs && !jobsLoading}
            onClick={() => setMode("job")}
            icon={<Briefcase size={18} />}
            title="Depuis une offre"
            description={
              hasJobs
                ? `${jobs.length} offre${jobs.length > 1 ? "s" : ""} disponible${jobs.length > 1 ? "s" : ""}`
                : "Aucune offre — créez-en une"
            }
            recommended={hasJobs}
          />
          <ModeCard
            active={mode === "duplicate"}
            disabled={!hasPackages && !pkgsLoading}
            onClick={() => setMode("duplicate")}
            icon={<Copy size={18} />}
            title="Dupliquer un package"
            description={
              hasPackages
                ? `${recentPackages.length} packages existants`
                : "Aucun package à dupliquer"
            }
          />
          <ModeCard
            active={mode === "scratch"}
            onClick={() => setMode("scratch")}
            icon={<FilePlus size={18} />}
            title="Partir de zéro"
            description="Saisie manuelle complète"
          />
        </div>

        {/* Pre-filled preview — only meaningful when not duplicating */}
        {mode !== "duplicate" && !defaults.loading && (
          <PrefillPreview
            prefilled={defaults.prefilled}
            mode={mode}
            jobSelected={
              mode === "job"
                ? jobs.find((j) => j.id === jobId) ?? null
                : null
            }
          />
        )}



        {/* Selection details */}
        <Card className="space-y-4">
          {mode === "job" && (
            <Field label="Offre source">
              {jobsLoading ? (
                <SkeletonRow />
              ) : !hasJobs ? (
                <EmptyHint>
                  Aucune offre.{" "}
                  <Link
                    to="/jobs/new"
                    className="text-aubergine underline hover:no-underline"
                  >
                    Créer une offre
                  </Link>
                </EmptyHint>
              ) : (
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full border border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 text-[13px] bg-white"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                      {j.location_city ? ` — ${j.location_city}` : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-grey mt-1.5">
                Missions, stack, remote, manager, process — tout est repris
                automatiquement.
              </p>
            </Field>
          )}

          {mode === "duplicate" && (
            <Field label="Package source">
              {pkgsLoading ? (
                <SkeletonRow />
              ) : !hasPackages ? (
                <EmptyHint>Aucun package existant.</EmptyHint>
              ) : (
                <select
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                  className="w-full border border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 text-[13px] bg-white"
                >
                  {recentPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.gross_salary
                        ? ` — ${(p.gross_salary / 1000).toFixed(0)}k€`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-grey mt-1.5">
                Une copie complète sera créée. Le titre, salaire et date
                pourront être modifiés dans l'éditeur.
              </p>
            </Field>
          )}

          {mode !== "duplicate" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Intitulé du package" required>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex : Senior Backend Engineer — Marie D."
                    className="w-full border border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 text-[13px]"
                  />
                </Field>
                <Field label="Salaire brut annuel">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={grossSalary}
                      onChange={(e) =>
                        setGrossSalary(e.target.value.replace(/[^\d\s]/g, ""))
                      }
                      placeholder="65 000"
                      className="w-full border border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 pr-8 text-[13px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-grey">
                      €
                    </span>
                  </div>
                </Field>
              </div>

              <Field label="Date de démarrage souhaitée (optionnel)">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-1/2 border border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 text-[13px]"
                />
              </Field>
            </>
          )}
        </Card>

        <div className="flex items-center justify-between pt-1">
          <Link
            to="/packages"
            className="text-[13px] text-grey hover:text-aubergine"
          >
            ← Annuler
          </Link>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {submitting ? "Création…" : "Créer et ouvrir l'éditeur"}
            {!submitting && (
              <ChevronRight
                size={16}
                className="inline-block ml-1 -mr-0.5 align-text-bottom"
              />
            )}
          </Button>
        </div>

        <p className="text-[11px] text-grey text-center pt-2">
          Tous les détails (equity, avantages, scénarios, process…) restent
          modifiables dans l'éditeur complet.
        </p>
      </div>
    </>
  );
}

function ModeCard({
  active,
  disabled,
  onClick,
  icon,
  title,
  description,
  recommended,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left rounded-[12px] border px-4 py-3.5 transition-all ${
        active
          ? "border-aubergine bg-[#F5F2FA] shadow-sm"
          : "border-[rgba(45,38,64,0.12)] bg-white hover:border-[rgba(45,38,64,0.25)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {recommended && (
        <span className="absolute -top-2 right-3 text-[9px] uppercase tracking-[0.1em] bg-aubergine text-lin px-1.5 py-0.5 rounded-full font-medium">
          Recommandé
        </span>
      )}
      <div className="flex items-center gap-2 text-aubergine">
        {icon}
        <span className="font-medium text-[13.5px]">{title}</span>
      </div>
      <p className="text-[11.5px] text-grey mt-1 leading-snug">{description}</p>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.08em] text-grey font-medium mb-1.5">
        {label}
        {required && <span className="text-[#A06060] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-9 rounded-lg bg-[#F0EBE8] animate-pulse" />
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-grey bg-[#FAF8F5] rounded-lg px-3 py-2">
      {children}
    </div>
  );
}

function PrefillPreview({
  prefilled,
  mode,
  jobSelected,
}: {
  prefilled: {
    benefits: number;
    equity: number;
    savings: number;
    companyProfile: boolean;
  };
  mode: "job" | "scratch";
  jobSelected: { title: string; location_city: string | null } | null;
}) {
  const items: { label: string; ok: boolean }[] = [
    {
      label:
        mode === "job" && jobSelected
          ? `Missions, stack, manager, process (offre « ${jobSelected.title} »)`
          : "Missions & process (à compléter)",
      ok: mode === "job" && !!jobSelected,
    },
    {
      label: "Politique remote, RTT, tickets resto, formation",
      ok: prefilled.companyProfile,
    },
    {
      label: `${prefilled.benefits} avantage${prefilled.benefits > 1 ? "s" : ""} du catalogue entreprise`,
      ok: prefilled.benefits > 0,
    },
    {
      label: `${prefilled.equity} dispositif equity pré-configuré`,
      ok: prefilled.equity > 0,
    },
    {
      label: `${prefilled.savings} dispositif${prefilled.savings > 1 ? "s" : ""} d'épargne (PEE/PERCO/…)`,
      ok: prefilled.savings > 0,
    },
  ];

  const okCount = items.filter((i) => i.ok).length;
  const empty = okCount === 0;

  return (
    <div
      className="rounded-[12px] border border-[rgba(139,127,168,0.25)] px-4 py-3.5"
      style={{ background: "linear-gradient(180deg,#F5F2FA 0%,#FAF8F5 100%)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-aubergine" />
        <span className="text-[12px] font-medium text-aubergine">
          {empty
            ? "Aucune donnée d'entreprise détectée"
            : `Pré-rempli automatiquement (${okCount}/${items.length})`}
        </span>
      </div>
      {empty ? (
        <p className="text-[11.5px] text-grey leading-snug">
          Renseignez votre profil entreprise et votre catalogue d'avantages
          dans{" "}
          <Link to="/settings" className="text-aubergine underline">
            Paramètres
          </Link>{" "}
          — ils seront alors appliqués automatiquement à chaque nouveau
          package.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className={`flex items-start gap-1.5 text-[11.5px] leading-snug ${
                it.ok ? "text-aubergine-light" : "text-grey/60"
              }`}
            >
              <Check
                size={12}
                className={`mt-0.5 shrink-0 ${
                  it.ok ? "text-[#3B6D11]" : "text-grey/30"
                }`}
              />
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
