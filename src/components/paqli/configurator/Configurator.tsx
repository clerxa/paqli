import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Button } from "@/components/paqli/Button";
import { Card } from "@/components/paqli/Card";
import { LegalNotice } from "@/components/paqli/LegalNotice";
import { Stepper } from "./Stepper";
import { PreviewPanel } from "./PreviewPanel";
import { SaveIndicator } from "./SaveIndicator";
import { StepCompany } from "./StepCompany";
import { Step0Job } from "./Step0Job";
import { Step1Fixed } from "./Step1Fixed";
import { StepBenefits } from "./StepBenefits";
import { Step2Equity } from "./Step2Equity";
import { Step3Savings } from "./Step3Savings";
import { Step4Scenarios } from "./Step4Scenarios";
import { Step5Preview } from "./Step5Preview";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { validateScenarios, validateStep } from "@/lib/packageConfig";

export function Configurator() {
  const { config, setConfig, saveDraft, saveState } = usePackageConfig();
  const navigate = useNavigate();
  const [maxReached, setMaxReached] = useState(config.currentStep);

  const setStep = (n: number) =>
    setConfig((prev) => ({ ...prev, currentStep: n }));

  const goNext = async () => {
    const err = validateStep(config, config.currentStep);
    if (err) {
      toast.error(err);
      return;
    }
    if (config.currentStep === 5 && config.equityDevices.length > 0) {
      const sErr = validateScenarios(config.scenarios);
      if (sErr) {
        toast.error(sErr);
        return;
      }
    }
    await saveDraft();
    if (config.currentStep < 7) {
      const next = config.currentStep + 1;
      setStep(next);
      setMaxReached((m) => Math.max(m, next));
    } else {
      navigate({ to: "/packages" });
    }
  };
  const goPrev = () => {
    if (config.currentStep > 0) setStep(config.currentStep - 1);
  };

  const stepNode = useMemo(() => {
    switch (config.currentStep) {
      case 0:
        return <StepCompany />;
      case 1:
        return <Step0Job />;
      case 2:
        return <Step1Fixed />;
      case 3:
        return <StepBenefits />;
      case 4:
        return <Step2Equity />;
      case 5:
        return <Step4Scenarios />;
      case 6:
        return <Step3Savings />;
      case 7:
        return <Step5Preview />;
      default:
        return null;
    }
  }, [config.currentStep]);

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
              {config.title || "Nouveau package"}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <Button variant="ghost" onClick={saveDraft}>
              Enregistrer
            </Button>
            <Button onClick={goNext}>
              {config.currentStep === 7 ? "Terminer" : "Suivant →"}
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-7 py-4 sm:py-6 grid grid-cols-12 gap-5">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card>
            <Stepper
              current={config.currentStep}
              maxReached={maxReached}
              onSelect={(n) => setStep(n)}
            />
          </Card>
        </aside>

        <section className="col-span-12 md:col-span-9 lg:col-span-7">
          <Card className="min-h-[500px]">
            {stepNode}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[rgba(45,38,64,0.06)]">
              <Button
                variant="ghost"
                onClick={goPrev}
                disabled={config.currentStep === 0}
              >
                ← Précédent
              </Button>
              <Button onClick={goNext}>
                {config.currentStep === 7 ? "Terminer" : "Suivant →"}
              </Button>
            </div>
          </Card>
          <div className="mt-3">
            <LegalNotice />
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3">
          <PreviewPanel config={config} />
        </aside>
      </div>
    </>
  );
}
