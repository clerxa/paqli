import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { fetchEquityPrice } from "@/lib/equityPrice.functions";
import { computeEquityValuation, formatMoney } from "@/lib/equityCalc";
import type { EquityDeviceForm } from "@/lib/packageConfig";
import { NumberField } from "./fields";
import { FieldTooltip } from "./FieldTooltip";

/**
 * Section "Valorisation" du configurateur equity (package-level).
 * Toggle coté / non coté + champs associés + carte récap temps réel.
 */
export function EquitySimulatorSection() {
  const { config, patch } = usePackageConfig();
  const fetchPrice = useServerFn(fetchEquityPrice);

  const [tickerInput, setTickerInput] = useState(config.equityTicker || "");
  const [lookupState, setLookupState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ok"; name: string; price: number; currency: string; fetchedAt: string }
    | { status: "err"; message: string }
  >({ status: "idle" });

  // Si on a un prix mis en cache, on l'affiche d'emblée
  const cachedHint =
    config.equityLastPrice && config.equityPriceFetchedAt
      ? `Dernier cours : ${config.equityLastPrice} ${config.equityLastPriceCurrency} (mis à jour ${new Date(config.equityPriceFetchedAt).toLocaleDateString("fr-FR")})`
      : null;

  const handleLookup = async () => {
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    setLookupState({ status: "loading" });
    try {
      const res = await fetchPrice({ data: { ticker: t } });
      if (!res.found) {
        setLookupState({ status: "err", message: "Symbole non reconnu — vérifiez l'orthographe" });
        return;
      }
      setLookupState({
        status: "ok",
        name: res.name,
        price: res.price,
        currency: res.currency,
        fetchedAt: res.fetchedAt,
      });
      patch({
        equityTicker: res.ticker,
        equityLastPrice: res.price,
        equityLastPriceCurrency: (res.currency as "EUR" | "USD") ?? "EUR",
        equityPriceFetchedAt: res.fetchedAt,
      });
    } catch (e) {
      setLookupState({ status: "err", message: "Erreur lors de la récupération du cours" });
    }
  };

  // Premier device pour la carte récap (le simulateur consolide via tous les devices)
  const devices = config.equityDevices ?? [];

  return (
    <div className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-[#FAF8F5] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-aubergine" style={{ fontSize: 16 }}>
            Simulateur de valorisation
          </h3>
          <p className="text-[12px] text-grey mt-0.5">
            Aide le candidat à se projeter sur ce que vaut son equity aujourd'hui et demain.
          </p>
        </div>
      </div>

      {/* Toggle coté / non coté */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => patch({ equityIsListed: true })}
          className={`text-[12px] px-3 py-2 rounded-md border transition-colors flex-1 ${
            config.equityIsListed
              ? "bg-aubergine text-lin border-aubergine"
              : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)]"
          }`}
        >
          🏛️ Entreprise cotée en bourse
        </button>
        <button
          type="button"
          onClick={() => patch({ equityIsListed: false })}
          className={`text-[12px] px-3 py-2 rounded-md border transition-colors flex-1 ${
            !config.equityIsListed
              ? "bg-aubergine text-lin border-aubergine"
              : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)]"
          }`}
        >
          🚀 Startup / non cotée
        </button>
      </div>

      {/* Branche A — cotée */}
      {config.equityIsListed && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px] text-aubergine-light font-medium flex items-center gap-1">
              Symbole boursier
              <FieldTooltip>
                Ticker boursier de l'entreprise (ex : FTNT pour Fortinet, DDOG pour Datadog).
                Le cours est récupéré en temps réel depuis Yahoo Finance.
              </FieldTooltip>
            </span>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="ex : FTNT, DDOG, AAPL"
                className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white uppercase"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupState.status === "loading" || !tickerInput.trim()}
                className="text-[12px] px-4 py-2 rounded-md bg-aubergine text-lin disabled:opacity-50"
              >
                {lookupState.status === "loading" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Vérifier"
                )}
              </button>
            </div>
            {cachedHint && lookupState.status === "idle" && (
              <span className="text-[11px] text-grey mt-1 block">{cachedHint}</span>
            )}
          </label>

          {lookupState.status === "ok" && (
            <div className="flex items-center gap-2 text-[12px] text-[#0E7C3A] bg-[#E8F5EC] px-3 py-2 rounded-md border border-[#0E7C3A]/20">
              <Check size={14} />
              <span>
                <strong>{lookupState.name}</strong> · {lookupState.price.toFixed(2)} {lookupState.currency} ·{" "}
                {new Date(lookupState.fetchedAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
          )}
          {lookupState.status === "err" && (
            <div className="flex items-center gap-2 text-[12px] text-danger bg-[#FBE9E7] px-3 py-2 rounded-md border border-danger/20">
              <AlertCircle size={14} />
              <span>{lookupState.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Branche B — non cotée */}
      {!config.equityIsListed && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NumberField
              label="Valorisation actuelle (€)"
              value={config.equityCompanyValuation}
              onChange={(v) => patch({ equityCompanyValuation: v })}
              placeholder="50000000"
              suffix="€"
              hint="Basée sur la dernière levée ou la valorisation interne"
            />
            <NumberField
              label="Total actions diluées"
              value={config.equityTotalShares}
              onChange={(v) => patch({ equityTotalShares: v })}
              placeholder="1000000"
              hint="Incluant BSPCE/BSA/actions ordinaires (cap table)"
            />
          </div>

          <label className="block">
            <span className="text-[12px] text-aubergine-light font-medium">
              Date de la dernière levée (optionnel)
            </span>
            <input
              type="date"
              value={config.equityLastRoundDate}
              onChange={(e) => patch({ equityLastRoundDate: e.target.value })}
              className="w-full md:w-1/2 text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
            />
          </label>

          <div className="space-y-2 pt-2 border-t border-[rgba(45,38,64,0.06)]">
            <div className="text-[12px] text-aubergine-light font-medium flex items-center gap-1">
              Scénarios de valorisation à 4 ans
              <FieldTooltip>
                Multiples appliqués à la valorisation actuelle.
                Sert à montrer au candidat 3 trajectoires possibles.
              </FieldTooltip>
            </div>
            <ScenarioSlider
              label="🔴 Pessimiste"
              value={config.equityScenarioBear}
              min={0.5}
              max={2}
              step={0.1}
              onChange={(v) => patch({ equityScenarioBear: v })}
            />
            <ScenarioSlider
              label="🟡 Réaliste"
              value={config.equityScenarioBase}
              min={1}
              max={5}
              step={0.5}
              onChange={(v) => patch({ equityScenarioBase: v })}
            />
            <ScenarioSlider
              label="🟢 Optimiste"
              value={config.equityScenarioBull}
              min={3}
              max={10}
              step={0.5}
              onChange={(v) => patch({ equityScenarioBull: v })}
            />
          </div>
        </div>
      )}

      {/* Récap valorisation par device */}
      {devices.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[rgba(45,38,64,0.06)]">
          {devices.map((d, i) => (
            <ValuationRecap key={d.id} device={d} index={i} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-grey italic leading-relaxed">
        ⚠️ Valeurs indicatives. Net = brut × 70% (PFU forfaitaire 30%) — la
        fiscalité réelle dépend de la situation personnelle du candidat.
      </p>
    </div>
  );
}

function ScenarioSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-aubergine w-28">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-aubergine"
      />
      <span className="text-[12px] font-mono text-aubergine w-12 text-right">
        ×{value.toFixed(1)}
      </span>
    </div>
  );
}

function ValuationRecap({ device, index }: { device: EquityDeviceForm; index: number }) {
  const { config } = usePackageConfig();

  const v = computeEquityValuation({
    device,
    currentPrice: config.equityIsListed ? config.equityLastPrice || null : null,
    currentPriceCurrency: config.equityLastPriceCurrency,
    companyValuation: !config.equityIsListed ? config.equityCompanyValuation : null,
    totalShares: !config.equityIsListed ? config.equityTotalShares : null,
    scenarios: !config.equityIsListed
      ? {
          bear: config.equityScenarioBear,
          base: config.equityScenarioBase,
          bull: config.equityScenarioBull,
        }
      : undefined,
  });

  if (!v.hasData) {
    return (
      <div className="text-[12px] text-grey italic px-3 py-2 bg-white rounded-md">
        Plan #{index + 1} : renseignez {config.equityIsListed ? "le ticker" : "la valorisation et le nombre d'actions"} pour voir l'estimation.
      </div>
    );
  }

  const curr = v.currency;

  return (
    <div className="bg-white rounded-md border border-[rgba(45,38,64,0.06)] p-3 space-y-2">
      <div className="flex items-center justify-between text-[12px] text-aubergine font-medium">
        <span>Plan #{index + 1} — {device.quantity.toLocaleString("fr-FR")} unités</span>
        <span className="text-grey font-normal">
          Prix/action : {v.pricePerShare.toFixed(2)} {curr}
        </span>
      </div>

      <div className="text-[12px] text-grey">
        Valeur actuelle brute :{" "}
        <strong className="text-aubergine">{formatMoney(v.currentTotalValueGross, curr)}</strong>
        <span className="mx-1">·</span>
        net estimatif :{" "}
        <strong className="text-aubergine">{formatMoney(v.currentTotalValueNet, curr)}</strong>
      </div>

      <div className="text-[11px] text-grey space-y-0.5 pt-1">
        {v.vestingSchedule.map((s) => (
          <div key={s.label} className="flex justify-between">
            <span>{s.label}</span>
            <span className="font-mono">
              {s.sharesVested.toLocaleString("fr-FR")} ·{" "}
              {formatMoney(s.valueGross, curr)} brut
            </span>
          </div>
        ))}
      </div>

      {v.scenarios && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(45,38,64,0.06)]">
          {(["bear", "base", "bull"] as const).map((k) => {
            const s = v.scenarios![k];
            const colors = {
              bear: "bg-red-50 text-red-700 border-red-200",
              base: "bg-amber-50 text-amber-700 border-amber-200",
              bull: "bg-emerald-50 text-emerald-700 border-emerald-200",
            }[k];
            const label = { bear: "Pessimiste", base: "Réaliste", bull: "Optimiste" }[k];
            return (
              <div key={k} className={`rounded-md border px-2 py-1.5 ${colors}`}>
                <div className="text-[10px] uppercase tracking-wide">{label}</div>
                <div className="text-[11px]">×{s.multiple.toFixed(1)}</div>
                <div className="text-[12px] font-semibold">{formatMoney(s.totalValue, curr)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
