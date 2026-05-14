import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { ConfirmModal } from "@/components/paqli/ConfirmModal";
import { useJobs } from "@/hooks/useJobs";
import { deleteJob } from "@/lib/jobsService";

export const Route = createFileRoute("/_app/jobs/")({
  component: JobsPage,
});

function JobsPage() {
  const { jobs, loading, reload } = useJobs();
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  async function handleDelete() {
    if (!confirm) return;
    try {
      await deleteJob(confirm.id);
      toast.success("Offre supprimée");
      setConfirm(null);
      reload();
    } catch (e) {
      console.error(e);
      toast.error("Erreur suppression");
    }
  }

  return (
    <>
      <Topbar
        title="Offres d'emploi"
        actions={
          <Link to="/jobs/new">
            <Button>Nouvelle offre</Button>
          </Link>
        }
      />
      <div className="px-7 py-6 space-y-4">
        {loading ? (
          <Card className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-16">
            <div style={{ fontSize: 48 }}>💼</div>
            <div
              className="font-display text-aubergine mt-4"
              style={{ fontSize: 18 }}
            >
              Aucune offre d'emploi
            </div>
            <div className="text-[13px] text-grey mt-2 max-w-sm mx-auto">
              Créez une offre pour la réutiliser ensuite à chaque nouveau
              package candidat — sans tout re-saisir.
            </div>
            <Link to="/jobs/new" className="inline-block mt-5">
              <Button>Créer une offre</Button>
            </Link>
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-[rgba(45,38,64,0.06)]">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-[#FAF8F5]"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-medium font-display shrink-0"
                    style={{ background: "#F0EBE8", color: "#524970" }}
                  >
                    {j.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-aubergine font-medium text-[14px] truncate">
                      {j.title}
                    </div>
                    <div className="text-[11px] text-grey mt-0.5 truncate">
                      {[
                        j.location_city,
                        j.contract_type?.toUpperCase(),
                        j.remote_policy,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <Link
                    to="/jobs/$id"
                    params={{ id: j.id }}
                    className="text-[12px] text-aubergine hover:underline"
                  >
                    Modifier
                  </Link>
                  <Link
                    to="/packages/new"
                    search={{ jobId: j.id }}
                    className="text-[12px] text-aubergine hover:underline"
                  >
                    + Package
                  </Link>
                  <button
                    onClick={() => setConfirm({ id: j.id, title: j.title })}
                    className="text-[12px] text-danger hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      {confirm && (
        <ConfirmModal
          title="Supprimer cette offre ?"
          message={`« ${confirm.title} » sera définitivement supprimée. Les packages existants ne sont pas affectés.`}
          confirmLabel="Supprimer"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
