import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { Chip, NumberField, TextArea, WarnBanner } from "./fields";
import { Button } from "@/components/paqli/Button";
import {
  defaultScenarios,
  estimateScenarioTotal,
  formatEur,
  type ScenarioForm,
  type ScenarioLabel,
} from "@/lib/packageConfig";

const scenarioMeta: Record<
  ScenarioLabel,
  { title: string; bg: string; border: string }
> = {
  pessimiste: { title: "Pessimiste", bg: "#F5F0EC", border: "rgba(122,63,14,0.18)" },
  realiste: { title: "Réaliste", bg: "#F5F2FA", border: "rgba(139,127,168,0.45)" },
  optimiste: { title: "Optimiste", bg: "#EAF3DE", border: "rgba(39,80,10,0.25)" },
};

export function Step4Scenarios() {
  const { config, patch } = usePackageConfig();
  const hasEquity = config.equityDevices.length > 0;

  const scenarios = useMemo<ScenarioForm[]>(() => {
    if (config.scenarios.length === 3) return config.scenarios;
    return defaultScenarios;
  }, [config.scenarios]);

  const updateScenario = (label: ScenarioLabel, p: Partial<ScenarioForm>) => {
    patch({
      scenarios: scenarios.map((s) => (s.label === label ? { ...s, ...p } : s)),
    });
  };

  if (!hasEquity) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
            Scénarios de valorisation
          </h2>
        </div>
        <div
          className="rounded-md px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: "#E6F1FB", color: "#0C447C" }}
        >
          <span className="mr-2">ℹ️</span>
          Vous n'avez pas configuré de dispositif equity (BSPCE, AGA, RSU…).
          Cette étape n'est pas nécessaire pour votre package.
        </div>
        <Link
          to="/packages/$id/edit"
          params={{ id: config.packageId ?? "" }}
          className="inline-block"
        >
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              patch({ currentStep: 5 });
            }}
          >
            Passer à l'étape suivante →
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Scénarios de valorisation
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Définissez trois scénarios de croissance pour aider le candidat à
          comprendre la fourchette possible de son equity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["pessimiste", "realiste", "optimiste"] as ScenarioLabel[]).map(
          (label) => {
            const s = scenarios.find((x) => x.label === label)!;
            const meta = scenarioMeta[label];
            const est = estimateScenarioTotal(
              config.equityDevices,
              s.targetValuationM,
            );
            return (
              <div
                key={label}
                className="rounded-[12px] p-4 space-y-3"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.08em] text-aubergine-light font-medium"
                >
                  {meta.title}
                </div>
                <NumberField
                  label="Valorisation cible"
                  suffix="M€"
                  value={s.targetValuationM}
                  onChange={(v) => updateScenario(label, { targetValuationM: v })}
                />
                <NumberField
                  label="Horizon"
                  suffix="ans"
                  value={s.horizonYears}
                  onChange={(v) => updateScenario(label, { horizonYears: v })}
                />
                <div className="border-t border-[rgba(45,38,64,0.08)] pt-3">
                  <div className="text-[10px] uppercase tracking-wider text-grey">
                    Estimation
                  </div>
                  <div
                    className="font-display text-aubergine mt-1"
                    style={{ fontSize: 18 }}
                  >
                    {est > 0 ? `~${formatEur(est)}` : "—"}
                  </div>
                  <div className="text-[10px] text-grey mt-1">
                    (ordre de grandeur)
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>

      <div>
        <TextArea
          label="Message de contexte pour le candidat"
          value={config.scenarioMessage}
          onChange={(v) => patch({ scenarioMessage: v })}
          placeholder="Ex : Notre dernière levée Série B valorise l'entreprise à 45M€. Nous visons une acquisition ou une IPO dans 4 à 5 ans..."
          maxLength={500}
        />
        <div className="text-[11px] text-grey mt-1 text-right">
          {config.scenarioMessage.length} / 500
        </div>
        <WarnBanner>
          Ce message sera visible par le candidat. Ne pas mentionner de
          projections financières précises ou de garanties de rendement.
        </WarnBanner>
      </div>

      <div>
        <div className="text-[12px] text-aubergine-light font-medium mb-2">
          Quels scénarios montrer au candidat ?
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={config.scenarioDisplay === "all"}
            onClick={() => patch({ scenarioDisplay: "all" })}
          >
            Les trois scénarios (recommandé)
          </Chip>
          <Chip
            selected={config.scenarioDisplay === "realistic_only"}
            onClick={() => patch({ scenarioDisplay: "realistic_only" })}
          >
            Réaliste uniquement
          </Chip>
          <Chip
            selected={config.scenarioDisplay === "realistic_optimistic"}
            onClick={() => patch({ scenarioDisplay: "realistic_optimistic" })}
          >
            Réaliste + optimiste
          </Chip>
        </div>
      </div>

      <WarnBanner>
        Ces scénarios sont des projections indicatives basées sur vos
        hypothèses. Paqli affichera automatiquement au candidat un avertissement
        précisant que ces estimations ne sont pas garanties et dépendent des
        performances futures de l'entreprise.
      </WarnBanner>
    </div>
  );
}
