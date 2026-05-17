import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { saveCurrentPackage } from "@/lib/saveCurrentPackage.functions";
import { formatEur } from "@/lib/clientCalc";
import type { CurrentPackagePayload } from "@/hooks/useCandidateLink";

interface Props {
  token: string;
  paqliGrossSalary: number;
  paqliVariableTarget: number;
  paqliBenefitsAnnualValue: number;
  initial: CurrentPackagePayload | null;
  onSaved: (payload: CurrentPackagePayload, savedAt: string) => void;
}

const MAX_BENEFITS = 3;

export function CurrentPackageComparator({
  token,
  paqliGrossSalary,
  paqliVariableTarget,
  paqliBenefitsAnnualValue,
  initial,
  onSaved,
}: Props) {
  const save = useServerFn(saveCurrentPackage);
  const [grossSalary, setGrossSalary] = useState<string>(
    initial?.gross_salary != null ? String(initial.gross_salary) : "",
  );
  const [variableTarget, setVariableTarget] = useState<string>(
    initial?.variable_target != null ? String(initial.variable_target) : "",
  );
  const [benefits, setBenefits] = useState<Array<{ label: string; annual_value: number }>>(
    initial?.benefits?.slice(0, MAX_BENEFITS) ?? [],
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initial ? "init" : null);

  const currentGross = Number(grossSalary) || 0;
  const currentVariable = Number(variableTarget) || 0;
  const currentBenefits = benefits.reduce((s, b) => s + (b.annual_value || 0), 0);
  const currentTotal = currentGross + currentVariable + currentBenefits;
  const paqliTotal = paqliGrossSalary + paqliVariableTarget + paqliBenefitsAnnualValue;

  const hasInput = currentGross > 0;

  const addBenefit = () => {
    if (benefits.length >= MAX_BENEFITS) return;
    setBenefits([...benefits, { label: "", annual_value: 0 }]);
  };
  const updateBenefit = (i: number, patch: Partial<{ label: string; annual_value: number }>) => {
    setBenefits(benefits.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const removeBenefit = (i: number) => {
    setBenefits(benefits.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!hasInput || saving) return;
    setSaving(true);
    try {
      const payload: CurrentPackagePayload = {
        gross_salary: currentGross,
        variable_target: currentVariable,
        benefits: benefits.filter((b) => b.label.trim() && b.annual_value > 0),
        note: note.trim() || null,
      };
      const res = await save({ data: { token, payload } });
      if (res.ok) {
        setSavedAt(res.savedAt);
        onSaved(payload, res.savedAt);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6" style={{ background: "#F5F2FA" }}>
        <h3 className="font-display text-aubergine" style={{ fontSize: 20 }}>
          Comparez avec votre situation actuelle
        </h3>
        <p className="text-[13px] text-aubergine-light mt-2 leading-relaxed">
          Renseignez votre package actuel (totalement optionnel et anonyme pour vous) pour visualiser
          concrètement ce que cette offre change pour vous. Ces informations aideront aussi l'équipe RH
          à mieux comprendre votre situation.
        </p>
      </div>

      <div className="rounded-2xl border border-aubergine/10 p-6 bg-white space-y-5">
        <div>
          <label className="text-[12px] font-medium text-aubergine block mb-1.5">
            Salaire brut annuel actuel
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              placeholder="Ex : 55000"
              className="w-full rounded-lg border border-aubergine/15 px-3 py-2.5 text-[14px] pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aubergine-light text-[13px]">€</span>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-aubergine block mb-1.5">
            Variable annuel cible (bonus, primes) — laissez vide si aucun
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={variableTarget}
              onChange={(e) => setVariableTarget(e.target.value)}
              placeholder="Ex : 5000"
              className="w-full rounded-lg border border-aubergine/15 px-3 py-2.5 text-[14px] pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aubergine-light text-[13px]">€</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-medium text-aubergine">
              Vos avantages clés (jusqu'à {MAX_BENEFITS})
            </label>
            {benefits.length < MAX_BENEFITS && (
              <button
                type="button"
                onClick={addBenefit}
                className="text-[12px] text-aubergine inline-flex items-center gap-1 hover:underline"
              >
                <Plus size={12} /> Ajouter
              </button>
            )}
          </div>
          {benefits.length === 0 && (
            <p className="text-[12px] text-aubergine-light">
              Ex : mutuelle, tickets resto, intéressement, prime vacances…
            </p>
          )}
          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={b.label}
                  onChange={(e) => updateBenefit(i, { label: e.target.value })}
                  placeholder="Avantage (ex : tickets resto)"
                  className="flex-1 rounded-lg border border-aubergine/15 px-3 py-2 text-[13px]"
                />
                <div className="relative w-32">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={b.annual_value || ""}
                    onChange={(e) => updateBenefit(i, { annual_value: Number(e.target.value) || 0 })}
                    placeholder="€/an"
                    className="w-full rounded-lg border border-aubergine/15 px-3 py-2 text-[13px] pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-aubergine-light text-[12px]">€</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  className="p-2 text-aubergine-light hover:text-aubergine"
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-aubergine block mb-1.5">
            Notes (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Précisions sur votre situation actuelle, vos critères clés…"
            className="w-full rounded-lg border border-aubergine/15 px-3 py-2 text-[13px] resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-aubergine-light">
            Visible uniquement par l'équipe RH de cette offre.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasInput || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-lin disabled:opacity-50"
            style={{ background: "#2D2640" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : savedAt ? <Check size={14} /> : null}
            {savedAt && !saving ? "Enregistré" : saving ? "Enregistrement…" : "Comparer"}
          </button>
        </div>
      </div>

      {hasInput && (
        <ComparisonResult
          currentGross={currentGross}
          currentVariable={currentVariable}
          currentBenefits={currentBenefits}
          currentTotal={currentTotal}
          paqliGross={paqliGrossSalary}
          paqliVariable={paqliVariableTarget}
          paqliBenefits={paqliBenefitsAnnualValue}
          paqliTotal={paqliTotal}
        />
      )}
    </div>
  );
}

function ComparisonResult({
  currentGross,
  currentVariable,
  currentBenefits,
  currentTotal,
  paqliGross,
  paqliVariable,
  paqliBenefits,
  paqliTotal,
}: {
  currentGross: number;
  currentVariable: number;
  currentBenefits: number;
  currentTotal: number;
  paqliGross: number;
  paqliVariable: number;
  paqliBenefits: number;
  paqliTotal: number;
}) {
  const delta = paqliTotal - currentTotal;
  const deltaPct = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
  const monthlyDelta = delta / 12;
  const fourYearDelta = delta * 4;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 text-center" style={{ background: delta >= 0 ? "#E8F5E9" : "#FBEAEA" }}>
        <div className="inline-flex items-center gap-2 text-[12px] font-medium text-aubergine-light mb-2">
          {delta > 0 ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
          Cette offre vs votre package actuel
        </div>
        <div className="font-display text-aubergine" style={{ fontSize: 36 }}>
          {delta >= 0 ? "+" : ""}{formatEur(delta)} / an
        </div>
        <div className="text-[13px] text-aubergine-light mt-1">
          Soit {delta >= 0 ? "+" : ""}{formatEur(Math.round(monthlyDelta))} par mois
          {currentTotal > 0 && (
            <> · {delta >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%</>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-aubergine/10 bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#FAF8F5" }}>
              <th className="text-left px-4 py-3 font-medium text-aubergine">Composante</th>
              <th className="text-right px-4 py-3 font-medium text-aubergine-light">Actuel</th>
              <th className="text-right px-4 py-3 font-medium text-aubergine">Cette offre</th>
              <th className="text-right px-4 py-3 font-medium text-aubergine">Δ</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Salaire brut" a={currentGross} b={paqliGross} />
            <Row label="Variable cible" a={currentVariable} b={paqliVariable} />
            <Row label="Avantages valorisés" a={currentBenefits} b={paqliBenefits} />
            <tr className="border-t border-aubergine/10" style={{ background: "#FAF8F5" }}>
              <td className="px-4 py-3 font-medium text-aubergine">Total brut</td>
              <td className="px-4 py-3 text-right text-aubergine-light">{formatEur(currentTotal)}</td>
              <td className="px-4 py-3 text-right font-medium text-aubergine">{formatEur(paqliTotal)}</td>
              <td className="px-4 py-3 text-right font-medium" style={{ color: delta >= 0 ? "#2D6A3A" : "#A03333" }}>
                {delta >= 0 ? "+" : ""}{formatEur(delta)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#FAEEDA" }}>
        <div className="text-[12px] font-medium text-aubergine-light mb-1">Projection sur 4 ans</div>
        <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
          {fourYearDelta >= 0 ? "+" : ""}{formatEur(fourYearDelta)}
        </div>
        <p className="text-[12px] text-aubergine-light mt-2 leading-relaxed">
          Différence cumulée brute sur 4 ans, hors equity et hors évolutions salariales.
          Cette offre inclut également des dispositifs (equity, épargne) à comparer séparément.
        </p>
      </div>
    </div>
  );
}

function Row({ label, a, b }: { label: string; a: number; b: number }) {
  const d = b - a;
  return (
    <tr className="border-t border-aubergine/5">
      <td className="px-4 py-2.5 text-aubergine">{label}</td>
      <td className="px-4 py-2.5 text-right text-aubergine-light">{a > 0 ? formatEur(a) : "—"}</td>
      <td className="px-4 py-2.5 text-right text-aubergine">{b > 0 ? formatEur(b) : "—"}</td>
      <td className="px-4 py-2.5 text-right text-[12px]" style={{ color: d >= 0 ? "#2D6A3A" : "#A03333" }}>
        {a > 0 && b > 0 ? `${d >= 0 ? "+" : ""}${formatEur(d)}` : "—"}
      </td>
    </tr>
  );
}
