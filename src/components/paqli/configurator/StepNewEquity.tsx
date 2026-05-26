import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles, Trash2, Plus } from "lucide-react";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { TextArea } from "./fields";
import { Toggle } from "./fields-v2";
import { EquityKnowledgePanel } from "./EquityKnowledgePanel";
import { EquitySimulatorSection } from "./EquitySimulatorSection";
import { VestingScheduleEditor } from "./VestingScheduleEditor";
import type { EquityDeviceForm, EquityType } from "@/lib/packageConfig";

const EQUITY_TYPES: { value: EquityType; label: string; desc: string }[] = [
  { value: "bspce", label: "BSPCE", desc: "Bons de souscription, startups FR" },
  { value: "aga", label: "AGA", desc: "Actions gratuites attribuées" },
  { value: "rsu", label: "RSU", desc: "Restricted Stock Units (grand groupe)" },
  { value: "stock_options", label: "Stock-options", desc: "Options classiques" },
  { value: "espp", label: "ESPP", desc: "Achat avec décote employé" },
];

function newDevice(type: EquityType = "bspce"): EquityDeviceForm {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    type,
    quantity: 0,
    strikePrice: 0,
    currentValuationM: 0,
    vestingYears: 4,
    cliffMonths: 12,
    specialConditions: "",
    vestingSchedule: null,
  };
}

type SubStep = "dispositif" | "vesting" | "valorisation";

const SUBSTEPS: { id: SubStep; label: string; hint: string }[] = [
  { id: "dispositif", label: "Dispositif", hint: "Type, quantité, strike" },
  { id: "vesting", label: "Vesting", hint: "Rythme, cliff, phases" },
  { id: "valorisation", label: "Valorisation", hint: "Prix, scénarios, projection" },
];

export function StepNewEquity() {
  const { config, patch } = usePackageConfig();
  const devices = config.equityDevices ?? [];
  const [sub, setSub] = useState<SubStep>("dispositif");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
            Equity
          </h2>
          <p className="text-[12px] text-grey mt-1">
            Décrivez le ou les plans d'equity en 3 étapes guidées.
          </p>
        </div>
        <EquityKnowledgePanel
          packageContext={`Package en cours : ${config.title || "(sans titre)"} — ${devices.length} plan(s) equity configuré(s).`}
        />
      </div>

      <SubStepsBar
        current={sub}
        onChange={setSub}
        canVesting={devices.length > 0}
        canValuation={devices.length > 0}
      />

      {sub === "dispositif" && (
        <DispositifStep
          devices={devices}
          onChange={(next) => patch({ equityDevices: next })}
          onContinue={() => devices.length > 0 && setSub("vesting")}
        />
      )}

      {sub === "vesting" && devices.length > 0 && (
        <VestingStep
          devices={devices}
          onChange={(next) => patch({ equityDevices: next })}
          acceleration={config.equityAcceleration}
          onAccelerationChange={(v) => patch({ equityAcceleration: v })}
          onBack={() => setSub("dispositif")}
          onContinue={() => setSub("valorisation")}
        />
      )}

      {sub === "valorisation" && devices.length > 0 && (
        <ValorisationStep onBack={() => setSub("vesting")} />
      )}
    </div>
  );
}

// ============================================================
// Sub-steps bar (visual progress)
// ============================================================

function SubStepsBar({
  current,
  onChange,
  canVesting,
  canValuation,
}: {
  current: SubStep;
  onChange: (s: SubStep) => void;
  canVesting: boolean;
  canValuation: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SUBSTEPS.map((s, i) => {
        const isCurrent = s.id === current;
        const isDone =
          (s.id === "dispositif" && current !== "dispositif") ||
          (s.id === "vesting" && current === "valorisation");
        const disabled =
          (s.id === "vesting" && !canVesting) ||
          (s.id === "valorisation" && !canValuation);
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.id)}
            className={`text-left rounded-lg border p-3 transition group ${
              isCurrent
                ? "border-aubergine bg-aubergine text-white shadow-sm"
                : isDone
                  ? "border-[rgba(45,38,64,0.12)] bg-[#F5F2FA] text-aubergine"
                  : "border-[rgba(45,38,64,0.08)] bg-white text-aubergine-light"
            } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-aubergine/40"}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isCurrent
                    ? "bg-white text-aubergine"
                    : isDone
                      ? "bg-aubergine text-white"
                      : "bg-[rgba(45,38,64,0.08)] text-aubergine-light"
                }`}
              >
                {isDone ? <Check size={11} /> : i + 1}
              </div>
              <span className="text-[12px] font-medium">{s.label}</span>
            </div>
            <p
              className={`text-[10.5px] mt-1 ${
                isCurrent ? "text-white/80" : "text-grey"
              }`}
            >
              {s.hint}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 1 — Dispositif
// ============================================================

function DispositifStep({
  devices,
  onChange,
  onContinue,
}: {
  devices: EquityDeviceForm[];
  onChange: (next: EquityDeviceForm[]) => void;
  onContinue: () => void;
}) {
  const update = (i: number, patchDev: Partial<EquityDeviceForm>) =>
    onChange(devices.map((d, j) => (j === i ? { ...d, ...patchDev } : d)));
  const remove = (i: number) => onChange(devices.filter((_, j) => j !== i));
  const add = () => onChange([...devices, newDevice()]);

  return (
    <div className="space-y-4">
      {devices.length === 0 && (
        <div className="rounded-lg border border-dashed border-[rgba(45,38,64,0.18)] bg-[#FAF8F5] p-6 text-center">
          <Sparkles className="mx-auto mb-2 text-aubergine-light" size={20} />
          <p className="text-[13px] text-aubergine font-medium">
            Aucun plan equity configuré
          </p>
          <p className="text-[12px] text-grey mt-1">
            Ajoutez un premier plan pour démarrer la simulation candidat.
          </p>
          <button
            type="button"
            onClick={add}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-aubergine px-4 py-2 text-[12px] font-medium text-white hover:bg-aubergine/90 transition"
          >
            <Plus size={14} /> Créer un plan
          </button>
        </div>
      )}

      {devices.map((d, i) => {
        const strikeLabel =
          d.type === "bspce" || d.type === "stock_options"
            ? "Prix d'exercice (strike)"
            : d.type === "espp"
              ? "Prix de souscription (après décote)"
              : "Valeur d'attribution";
        return (
          <div
            key={d.id}
            className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between bg-[#FAF8F5] px-4 py-2.5 border-b border-[rgba(45,38,64,0.06)]">
              <span className="text-[12px] font-medium text-aubergine">
                Plan #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-grey hover:text-danger flex items-center gap-1 text-[11px]"
              >
                <Trash2 size={12} /> Retirer
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <span className="text-[11px] text-aubergine-light font-medium uppercase tracking-wide">
                  Type d'instrument
                </span>
                <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                  {EQUITY_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update(i, { type: t.value })}
                      title={t.desc}
                      className={`px-2 py-2 rounded-md text-[11px] font-medium border transition ${
                        d.type === t.value
                          ? "bg-aubergine text-white border-aubergine"
                          : "bg-white text-aubergine-light border-[rgba(45,38,64,0.12)] hover:border-aubergine/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-grey mt-1.5">
                  {EQUITY_TYPES.find((t) => t.value === d.type)?.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <BigNumField
                  label="Nombre d'unités attribuées"
                  value={d.quantity}
                  onChange={(v) => update(i, { quantity: v })}
                />
                <BigNumField
                  label={strikeLabel}
                  value={d.strikePrice}
                  onChange={(v) => update(i, { strikePrice: v })}
                  suffix="€"
                />
              </div>

              <TextArea
                label="Conditions particulières (optionnel)"
                value={d.specialConditions}
                onChange={(v) => update(i, { specialConditions: v })}
                placeholder="ex : accélération en cas de rachat, plan qualifié BSPCE…"
              />
            </div>
          </div>
        );
      })}

      {devices.length > 0 && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-aubergine/30 bg-white py-3 text-[12px] text-aubergine hover:bg-aubergine/5 transition"
        >
          <Plus size={14} /> Ajouter un autre plan (BSPCE + ESPP, etc.)
        </button>
      )}

      {devices.length > 0 && (
        <div className="flex justify-end pt-2">
          <NavBtn onClick={onContinue} dir="next">
            Continuer — Vesting
          </NavBtn>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Step 2 — Vesting (par plan)
// ============================================================

function VestingStep({
  devices,
  onChange,
  acceleration,
  onAccelerationChange,
  onBack,
  onContinue,
}: {
  devices: EquityDeviceForm[];
  onChange: (next: EquityDeviceForm[]) => void;
  acceleration: boolean;
  onAccelerationChange: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [openIdx, setOpenIdx] = useState(0);
  const update = (i: number, patchDev: Partial<EquityDeviceForm>) =>
    onChange(devices.map((d, j) => (j === i ? { ...d, ...patchDev } : d)));

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[#F5F2FA] border border-[rgba(139,127,168,0.3)] p-3 text-[11.5px] text-aubergine">
        <strong className="font-medium">Vesting non-linéaire ?</strong>{" "}
        Basculez en mode <em>Avancé</em> pour combiner plusieurs rythmes
        (ex : cliff 12 mois + trimestriel sur 3 ans, ou mensuel après cliff).
      </div>

      {devices.length > 1 && (
        <div className="flex gap-1.5">
          {devices.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition ${
                i === openIdx
                  ? "bg-aubergine text-white"
                  : "bg-white border border-[rgba(45,38,64,0.12)] text-aubergine-light hover:border-aubergine/30"
              }`}
            >
              Plan #{i + 1}
            </button>
          ))}
        </div>
      )}

      {devices[openIdx] && (
        <div className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-white p-4 space-y-4">
          <div className="text-[12px] font-medium text-aubergine">
            Plan #{openIdx + 1} ·{" "}
            <span className="text-aubergine-light">
              {EQUITY_TYPES.find((t) => t.value === devices[openIdx].type)?.label}
            </span>
          </div>
          <VestingScheduleEditor
            value={devices[openIdx].vestingSchedule}
            onChange={(next) => update(openIdx, { vestingSchedule: next })}
            fallbackYears={devices[openIdx].vestingYears}
            fallbackCliffMonths={devices[openIdx].cliffMonths}
            onFallbackYearsChange={(v) => update(openIdx, { vestingYears: v })}
            onFallbackCliffChange={(v) => update(openIdx, { cliffMonths: v })}
          />
        </div>
      )}

      <div className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-white p-3">
        <Toggle
          label="Accélération en cas de rachat ou IPO (tous plans)"
          value={acceleration}
          onChange={onAccelerationChange}
        />
      </div>

      <div className="flex justify-between pt-2">
        <NavBtn onClick={onBack} dir="prev">
          Dispositif
        </NavBtn>
        <NavBtn onClick={onContinue} dir="next">
          Continuer — Valorisation
        </NavBtn>
      </div>
    </div>
  );
}

// ============================================================
// Step 3 — Valorisation (simulateur existant)
// ============================================================

function ValorisationStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <EquitySimulatorSection />
      <div className="flex justify-between pt-2">
        <NavBtn onClick={onBack} dir="prev">
          Vesting
        </NavBtn>
      </div>
    </div>
  );
}

// ============================================================
// Reusable bits
// ============================================================

function NavBtn({
  children,
  onClick,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  dir: "prev" | "next";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-medium transition ${
        dir === "next"
          ? "bg-aubergine text-white hover:bg-aubergine/90"
          : "bg-white border border-[rgba(45,38,64,0.12)] text-aubergine-light hover:border-aubergine/30"
      }`}
    >
      {dir === "prev" && <ChevronLeft size={14} />}
      {children}
      {dir === "next" && <ChevronRight size={14} />}
    </button>
  );
}

function BigNumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-aubergine-light font-medium uppercase tracking-wide">
        {label}
      </span>
      <div className="relative mt-1">
        <input
          type="number"
          value={value || ""}
          min={0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-full text-[15px] font-medium text-aubergine font-display px-3 py-2.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white focus:border-aubergine focus:ring-1 focus:ring-aubergine/20 outline-none transition"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-grey pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
