import { useState, useMemo } from "react";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import {
  BENEFIT_CATALOG,
  CATEGORY_LABELS,
  GYMLIB_LEVELS,
  VISIBLE_CATEGORIES,
  buildSavingsMessage,
  calcBenefitsTotal,
  estimateBenefitValue,
  getBenefitDef,
  type BenefitCategory,
  type BenefitDefinition,
  type PackageBenefit,
} from "@/lib/benefitCatalog";

const CATEGORIES = VISIBLE_CATEGORIES;

export function StepBenefits() {
  const { config, patch } = usePackageConfig();
  const [activeCategory, setActiveCategory] = useState<BenefitCategory>("health");

  const selected = config.benefitsV2 ?? [];
  const totalBenefitsValue = useMemo(() => calcBenefitsTotal(selected), [selected]);

  const setSelected = (next: PackageBenefit[]) => patch({ benefitsV2: next });

  function toggleBenefit(def: BenefitDefinition) {
    const exists = selected.find((b) => b.benefit_key === def.key);
    if (exists) {
      setSelected(selected.filter((b) => b.benefit_key !== def.key));
    } else {
      setSelected([
        ...selected,
        {
          benefit_key: def.key,
          category: def.category,
          value_type: def.valueType,
          monthly_value: def.defaultMonthlyValue ?? null,
          annual_value: def.defaultAnnualValue ?? null,
        },
      ]);
    }
  }

  function updateBenefit(key: string, p: Partial<PackageBenefit>) {
    setSelected(
      selected.map((b) => (b.benefit_key === key ? { ...b, ...p } : b)),
    );
  }

  const benefitsInCategory = BENEFIT_CATALOG.filter(
    (b) => b.category === activeCategory,
  );

  const grossSalary = config.grossSalary ?? 0;
  const variableTarget = config.variableTarget ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
            Avantages & Total Compensation
          </h2>
          <p className="text-[12px] text-grey mt-1">
            Chaque avantage est traduit en euros réels — ce que le candidat ne
            sortira pas de sa poche.
          </p>
        </div>
        {totalBenefitsValue > 0 && (
          <div
            className="text-right rounded-xl px-4 py-2.5 flex-shrink-0"
            style={{
              background: "#F5F2FA",
              border: "1px solid rgba(139,127,168,0.2)",
            }}
          >
            <div className="text-[10px] text-grey uppercase tracking-wide mb-0.5">
              Valeur avantages
            </div>
            <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
              ~{Math.round(totalBenefitsValue / 100) * 100} €/an
            </div>
          </div>
        )}
      </div>

      {/* Catégories */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = selected.filter((b) => b.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border"
              style={
                activeCategory === cat
                  ? {
                      background: "#2D2640",
                      color: "#FAF8F5",
                      borderColor: "#2D2640",
                    }
                  : {
                      background: "white",
                      color: "#524970",
                      borderColor: "rgba(45,38,64,0.12)",
                    }
              }
            >
              {CATEGORY_LABELS[cat]}
              {count > 0 && (
                <span className="ml-1.5 text-[9px] opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {benefitsInCategory.map((def) => {
          const sel = selected.find((b) => b.benefit_key === def.key);
          const isSelected = !!sel;
          const annualVal = sel
            ? estimateBenefitValue(sel)
            : def.defaultAnnualValue ??
              (def.defaultMonthlyValue ? def.defaultMonthlyValue * 12 : 0);

          return (
            <div
              key={def.key}
              className="border rounded-xl overflow-hidden transition-all"
              style={{
                borderColor: isSelected
                  ? "rgba(139,127,168,0.3)"
                  : "rgba(45,38,64,0.08)",
                background: isSelected ? "#F5F2FA" : "white",
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => toggleBenefit(def)}
              >
                <span className="text-xl flex-shrink-0">{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-aubergine">
                    {def.label}
                  </div>
                  {def.valueType !== "qualitative" && annualVal > 0 ? (
                    <div className="text-[11px] text-aubergine-light font-light">
                      {buildSavingsMessage(def.key, annualVal)}
                    </div>
                  ) : def.valueType === "qualitative" ? (
                    <div className="text-[11px] text-grey font-light italic">
                      Signal qualitatif — non monétisable
                    </div>
                  ) : (
                    <div className="text-[11px] text-grey font-light">
                      {def.description}
                    </div>
                  )}
                </div>
                {def.valueType !== "qualitative" && annualVal > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-medium text-aubergine">
                      ~{annualVal.toLocaleString("fr-FR")} €
                    </div>
                    <div className="text-[10px] text-grey">/an</div>
                  </div>
                )}
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isSelected ? "#2D2640" : "white",
                    borderColor: isSelected
                      ? "#2D2640"
                      : "rgba(45,38,64,0.2)",
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {isSelected && def.inputType === "amount" && (
                <div
                  className="px-4 pb-3 border-t"
                  style={{ borderColor: "rgba(139,127,168,0.1)" }}
                >
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-[11px] text-grey flex-shrink-0">
                      Montant ({def.unit})
                    </label>
                    <input
                      type="number"
                      value={
                        def.unit?.includes("/mois") || def.unit?.includes("séances")
                          ? sel.monthly_value ?? ""
                          : sel.annual_value ?? ""
                      }
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (def.unit?.includes("/mois") || def.unit?.includes("séances")) {
                          updateBenefit(def.key, {
                            monthly_value: v,
                            annual_value: null,
                          });
                        } else {
                          updateBenefit(def.key, {
                            annual_value: v,
                            monthly_value: null,
                          });
                        }
                      }}
                      className="flex-1 h-8 px-3 rounded-lg text-[12px] text-aubergine outline-none"
                      style={{
                        border: "1px solid rgba(45,38,64,0.12)",
                        background: "white",
                      }}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  {def.hint && (
                    <p
                      className="text-[10px] font-light mt-1.5 leading-relaxed"
                      style={{ color: "#B8AECF" }}
                    >
                      💡 {def.hint}
                    </p>
                  )}
                </div>
              )}

              {isSelected && def.key === "gymlib" && (
                <div
                  className="px-4 pb-3 border-t"
                  style={{ borderColor: "rgba(139,127,168,0.1)" }}
                >
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {GYMLIB_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() =>
                          updateBenefit(def.key, {
                            monthly_value: level.monthly,
                            annual_value: level.monthly * 12,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all"
                        style={
                          sel?.monthly_value === level.monthly
                            ? {
                                background: "#2D2640",
                                color: "#FAF8F5",
                                borderColor: "#2D2640",
                              }
                            : {
                                background: "white",
                                color: "#524970",
                                borderColor: "rgba(45,38,64,0.12)",
                              }
                        }
                      >
                        {level.label} — {level.monthly}€/mois
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Avantages personnalisés (catégorie active) */}
      <CustomBenefitsSection
        category={activeCategory}
        benefits={selected.filter(
          (b) => b.category === activeCategory && b.benefit_key.startsWith("custom:"),
        )}
        onAdd={() => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2);
          setSelected([
            ...selected,
            {
              benefit_key: `custom:${id}`,
              category: activeCategory,
              value_type: "fixed",
              custom_label: "",
              annual_value: 0,
              monthly_value: null,
            },
          ]);
        }}
        onUpdate={(key, p) => updateBenefit(key, p)}
        onRemove={(key) =>
          setSelected(selected.filter((b) => b.benefit_key !== key))
        }
      />

      {/* Récap Total Compensation */}
      {selected.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: "#2D2640" }}>
          <div
            className="text-[10px] uppercase tracking-wide mb-3"
            style={{ color: "#8B7FA8" }}
          >
            Total Compensation estimée
          </div>
          <div className="space-y-2 mb-4">
            <Row label="Salaire brut annuel" value={grossSalary} />
            {variableTarget > 0 && (
              <Row label="Variable cible" value={variableTarget} />
            )}
            <Row
              label={`Avantages valorisés (${selected.filter((b) => estimateBenefitValue(b) > 0).length})`}
              value={totalBenefitsValue}
              accent
            />
          </div>
          <div
            className="border-t pt-3"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-white font-medium">
                Total Compensation (hors equity)
              </span>
              <span className="font-display text-white" style={{ fontSize: 22 }}>
                ~
                {Math.round(
                  (grossSalary + variableTarget + totalBenefitsValue) / 1000,
                )}
                k €
              </span>
            </div>
            <div
              className="text-[10px] font-light mt-1"
              style={{ color: "#8B7FA8" }}
            >
              Estimation brute — voir le détail net dans la vue candidat
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span style={{ color: "#B8AECF" }}>{label}</span>
      <span style={{ color: accent ? "#C4A882" : "white" }}>
        {value > 0 ? `${value.toLocaleString("fr-FR")} €` : "—"}
      </span>
    </div>
  );
}

function CustomBenefitsSection({
  category,
  benefits,
  onAdd,
  onUpdate,
  onRemove,
}: {
  category: BenefitCategory;
  benefits: PackageBenefit[];
  onAdd: () => void;
  onUpdate: (key: string, p: Partial<PackageBenefit>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#FAF8F5", border: "1px dashed rgba(45,38,64,0.15)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[12px] font-medium text-aubergine">
            Avantage sur mesure
          </div>
          <div className="text-[11px] text-grey mt-0.5">
            Catégorie « {CATEGORY_LABELS[category]} ». Pour les avantages spécifiques à votre entreprise.
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-aubergine text-aubergine hover:bg-aubergine hover:text-white transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {benefits.length > 0 && (
        <div className="space-y-2">
          {benefits.map((b) => (
            <div
              key={b.benefit_key}
              className="bg-white rounded-lg p-3 border border-[rgba(45,38,64,0.08)] space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={b.custom_label ?? ""}
                  onChange={(e) =>
                    onUpdate(b.benefit_key, { custom_label: e.target.value })
                  }
                  placeholder="Nom de l'avantage (ex : Cours de yoga hebdo)"
                  className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
                  maxLength={80}
                />
                <button
                  type="button"
                  onClick={() => onRemove(b.benefit_key)}
                  className="text-grey hover:text-danger px-2 text-[12px]"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={b.value_type}
                  onChange={(e) =>
                    onUpdate(b.benefit_key, {
                      value_type: e.target.value as PackageBenefit["value_type"],
                      annual_value:
                        e.target.value === "qualitative" ? null : b.annual_value,
                    })
                  }
                  className="text-[12px] px-2 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                >
                  <option value="fixed">Valeur fixe</option>
                  <option value="estimated">Valeur estimée</option>
                  <option value="qualitative">Qualitatif (non chiffré)</option>
                </select>
                {b.value_type !== "qualitative" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={b.annual_value ?? ""}
                      onChange={(e) =>
                        onUpdate(b.benefit_key, {
                          annual_value: parseFloat(e.target.value) || 0,
                          monthly_value: null,
                        })
                      }
                      placeholder="0"
                      className="w-28 text-[12px] px-2 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                    />
                    <span className="text-[11px] text-grey">€/an</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={b.custom_note ?? ""}
                onChange={(e) =>
                  onUpdate(b.benefit_key, { custom_note: e.target.value })
                }
                placeholder="Note (optionnel) — ex : depuis 2 ans, plébiscité par l'équipe"
                className="w-full text-[11px] px-3 py-1.5 rounded-md border border-[rgba(45,38,64,0.08)] focus:outline-none focus:border-aubergine bg-white text-grey"
                maxLength={120}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
