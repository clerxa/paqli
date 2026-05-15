import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { StatusPill } from "@/components/paqli/StatusPill";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { ConfirmModal } from "@/components/paqli/ConfirmModal";
import {
  archivePackage,
  deletePackage,
  duplicatePackage,
  usePackages,
  type PackageFilter,
  type PackageWithStats,
} from "@/hooks/usePackages";

export const Route = createFileRoute("/_app/packages/")({
  component: PackagesPage,
});

const filters: { value: PackageFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "draft", label: "Brouillons" },
  { value: "archived", label: "Archivés" },
];

function PackagesPage() {
  const [filter, setFilter] = useState<PackageFilter>("all");
  const { packages, loading, reload } = usePackages(filter);
  const [confirm, setConfirm] = useState<{
    type: "archive" | "delete";
    id: string;
    title: string;
  } | null>(null);

  async function handleDuplicate(id: string) {
    try {
      await duplicatePackage(id);
      toast.success("Package dupliqué");
      reload();
    } catch (e) {
      console.error(e);
      toast.error("Erreur duplication");
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    try {
      if (confirm.type === "archive") {
        await archivePackage(confirm.id);
        toast.success("Package archivé");
      } else {
        await deletePackage(confirm.id);
        toast.success("Package supprimé");
      }
      setConfirm(null);
      reload();
    } catch (e) {
      console.error(e);
      toast.error("Erreur");
    }
  }

  return (
    <>
      <Topbar
        title="Packages"
        actions={
          <Link to="/packages/new">
            <Button>Nouveau package</Button>
          </Link>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 space-y-4">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.value
                  ? "bg-aubergine text-lin border-aubergine"
                  : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)] hover:border-aubergine"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Card className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Card>
        ) : packages.length === 0 ? (
          <EmptyState />
        ) : (
          <Card className="!p-0">
            <div className="divide-y divide-[rgba(45,38,64,0.06)]">
              {packages.map((p) => (
                <PackageRow
                  key={p.id}
                  pkg={p}
                  onDuplicate={() => handleDuplicate(p.id)}
                  onArchive={() =>
                    setConfirm({ type: "archive", id: p.id, title: p.title })
                  }
                  onDelete={() =>
                    setConfirm({ type: "delete", id: p.id, title: p.title })
                  }
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={
            confirm.type === "archive"
              ? "Archiver ce package ?"
              : "Supprimer ce package ?"
          }
          message={
            confirm.type === "archive"
              ? `« ${confirm.title} » ne sera plus visible dans les actifs mais restera consultable.`
              : `« ${confirm.title} » sera définitivement supprimé, ainsi que tous les liens candidats associés.`
          }
          confirmLabel={confirm.type === "archive" ? "Archiver" : "Supprimer"}
          confirmVariant={confirm.type === "delete" ? "danger" : "primary"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function PackageRow({
  pkg,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  pkg: PackageWithStats;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = pkg.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="px-5 py-4 flex items-center gap-4 hover:bg-[#FAF8F5] cursor-pointer"
      onClick={() => navigate({ to: "/packages/$id", params: { id: pkg.id } })}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-medium font-display shrink-0"
        style={{ background: "#F0EBE8", color: "#524970" }}
      >
        {initials || "—"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-aubergine font-medium text-[14px] truncate">
          {pkg.title}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {pkg.deviceTypes.map((t, i) => (
            <DeviceChip key={i} type={t} />
          ))}
          <span className="text-[11px] text-grey ml-1">
            Mis à jour {timeAgo(pkg.updated_at)}
          </span>
        </div>
      </div>
      <div className="hidden sm:block text-right text-[12px] text-aubergine-light w-24 shrink-0">
        <div>{pkg.totalLinks} lien{pkg.totalLinks > 1 ? "s" : ""}</div>
        <div className="text-grey">{pkg.openedLinks} ouvert{pkg.openedLinks > 1 ? "s" : ""}</div>
        <div className="text-grey">{pkg.openRate}% ouv.</div>
      </div>
      <div className="hidden md:flex items-center gap-1.5 w-20 shrink-0" title="Score d'attractivité IA">
        {pkg.attractivenessScore !== null ? (
          <>
            <div className="flex-1 h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${pkg.attractivenessScore}%`,
                  background:
                    pkg.attractivenessScore >= 80
                      ? "#3B6D11"
                      : pkg.attractivenessScore >= 60
                        ? "#8B7FA8"
                        : "#C4A882",
                }}
              />
            </div>
            <span className="text-[11px] text-grey w-6 text-right">
              {pkg.attractivenessScore}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-grey/50 w-full text-center">—</span>
        )}
      </div>
      <div className="hidden md:block w-20 shrink-0" title={`Profil complété à ${pkg.richness}%`}>
        <div className="text-[10px] uppercase tracking-[0.1em] text-grey mb-1 text-right">
          {pkg.richness}%
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "#F0EBE8" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${pkg.richness}%`,
              background:
                pkg.richness >= 70
                  ? "#3B6D11"
                  : pkg.richness >= 40
                    ? "#C4A882"
                    : "#A06060",
            }}
          />
        </div>
      </div>
      <div className="w-20 shrink-0 flex justify-center">
        <StatusPill status={pkg.status} />
      </div>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen((m) => !m)}
          className="w-8 h-8 rounded hover:bg-[rgba(45,38,64,0.06)] text-aubergine-light"
          aria-label="Actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-9 z-50 bg-white border border-[rgba(45,38,64,0.1)] rounded-md shadow-lg py-1 min-w-[160px] text-[13px]"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                navigate({ to: "/packages/$id/edit", params: { id: pkg.id } });
              }}
            >
              Modifier
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
            >
              Dupliquer
            </MenuItem>
            {pkg.status !== "archived" && (
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onArchive();
                }}
              >
                Archiver
              </MenuItem>
            )}
            <MenuItem
              danger
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              Supprimer
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 hover:bg-[#FAF8F5] ${
        danger ? "text-danger" : "text-aubergine-light"
      }`}
    >
      {children}
    </button>
  );
}

export function DeviceChip({ type }: { type: string }) {
  const equity = ["bspce", "aga", "rsu", "stock_options", "espp"];
  const savings = ["pee", "perco"];
  let bg = "rgba(45,38,64,0.07)";
  let color = "#524970";
  if (equity.includes(type)) {
    bg = "rgba(139,127,168,0.1)";
    color = "#6B5F88";
  } else if (savings.includes(type)) {
    bg = "rgba(196,168,130,0.12)";
    color = "#A08860";
  }
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        background: bg,
        color,
      }}
    >
      {type.replace("_", " ")}
    </span>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-16">
      <div style={{ fontSize: 48 }}>📦</div>
      <div
        className="font-display text-aubergine mt-4"
        style={{ fontSize: 18 }}
      >
        Aucun package pour l'instant
      </div>
      <div className="text-[13px] text-grey mt-2 max-w-sm mx-auto">
        Créez votre premier package pour commencer à partager vos offres avec
        les candidats.
      </div>
      <Link to="/packages/new" className="inline-block mt-5">
        <Button>Créer un package</Button>
      </Link>
    </Card>
  );
}

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
