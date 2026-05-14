import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { JobForm, validateJob } from "@/components/paqli/jobs/JobForm";
import { useAuth } from "@/hooks/useAuth";
import {
  emptyJob,
  getJob,
  rowToJobInput,
  updateJob,
  type JobInput,
} from "@/lib/jobsService";

export const Route = createFileRoute("/_app/jobs/$id")({
  component: EditJobPage,
});

function EditJobPage() {
  const { id } = Route.useParams();
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<JobInput>(emptyJob);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await getJob(id);
        if (!active) return;
        if (!row) {
          toast.error("Offre introuvable");
          navigate({ to: "/jobs" });
          return;
        }
        setValue(rowToJobInput(row));
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  async function save() {
    const err = validateJob(value);
    if (err) {
      toast.error(err);
      return;
    }
    if (!user || !organization) return;
    setSaving(true);
    try {
      await updateJob(id, value, organization.id, user.id);
      toast.success("Offre mise à jour");
      navigate({ to: "/jobs" });
    } catch (e) {
      console.error(e);
      toast.error("Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/jobs" className="hover:text-aubergine">
              Offres d'emploi
            </Link>
            <span className="mx-2">/</span>
            <span
              className="text-aubergine font-display"
              style={{ fontSize: 22 }}
            >
              {value.title || "Modifier l'offre"}
            </span>
          </span>
        }
        actions={
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      />
      <div className="px-7 py-6 max-w-3xl">
        <Card>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <JobForm value={value} onChange={setValue} />
              <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-[rgba(45,38,64,0.06)]">
                <Link to="/jobs">
                  <Button variant="ghost">Annuler</Button>
                </Link>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
