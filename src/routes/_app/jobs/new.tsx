import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { LegalNotice } from "@/components/paqli/LegalNotice";
import { JobForm, validateJob } from "@/components/paqli/jobs/JobForm";
import { useAuth } from "@/hooks/useAuth";
import { createJob, emptyJob, type JobInput } from "@/lib/jobsService";

export const Route = createFileRoute("/_app/jobs/new")({
  component: NewJobPage,
});

function NewJobPage() {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<JobInput>(emptyJob);
  const [saving, setSaving] = useState(false);

  async function save() {
    const err = validateJob(value);
    if (err) {
      toast.error(err);
      return;
    }
    if (!user || !organization) return;
    setSaving(true);
    try {
      await createJob(value, organization.id, user.id);
      toast.success("Offre créée");
      navigate({ to: "/jobs" });
    } catch (e) {
      console.error(e);
      toast.error("Erreur création");
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
              Nouvelle offre
            </span>
          </span>
        }
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Créer l'offre"}
          </Button>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl">
        <Card>
          <JobForm value={value} onChange={setValue} />
          <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-[rgba(45,38,64,0.06)]">
            <Link to="/jobs">
              <Button variant="ghost">Annuler</Button>
            </Link>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Créer l'offre"}
            </Button>
          </div>
        </Card>
        <div className="mt-3">
          <LegalNotice />
        </div>
      </div>
    </>
  );
}
