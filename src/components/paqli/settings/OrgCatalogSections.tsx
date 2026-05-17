import { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/paqli/Card";
import {
  BENEFIT_CATALOG,
  CATEGORY_LABELS,
  type BenefitCategory,
} from "@/lib/benefitCatalog";
import type { EquityType, SavingsType } from "@/lib/packageConfig";

const inputCls =
  "w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-lavande";

const EQUITY_TYPES: { value: EquityType; label: string }[] = [
  { value: "bspce", label: "BSPCE" },
  { value: "aga", label: "AGA" },
  { value: "rsu", label: "RSU" },
  { value: "stock_options", label: "Stock-options" },
  { value: "espp", label: "ESPP" },
];

const SAVINGS_TYPES: { value: SavingsType; label: string }[] = [
  { value: "pee", label: "PEE" },
  { value: "perco", label: "PERCO" },
  { value: "interessement", label: "Intéressement" },
  { value: "participation", label: "Participation" },
];

/* ============================================================
 *  Avantages
 * ============================================================ */

interface BenefitRow {
  id: string;
  benefit_key: string;
  category: BenefitCategory;
  custom_label: string | null;
  value_type: "fixed" | "estimated" | "qualitative";
  monthly_value: number | null;
  annual_value: number | null;
  employer_share: number | null;
  display_order: number;
}

function BenefitsCatalogCard() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<BenefitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingKey, setAddingKey] = useState<string>("");

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("org_benefit_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");
      setRows((data ?? []) as BenefitRow[]);
      setLoading(false);
    })();
  }, [organization?.id]);

  async function addPreset() {
    if (!organization?.id || !addingKey) return;
    const def = BENEFIT_CATALOG.find((b) => b.key === addingKey);
    if (!def) return;
    if (rows.find((r) => r.benefit_key === def.key)) {
      toast.error("Déjà dans le catalogue");
      return;
    }
    const { data, error } = await supabase
      .from("org_benefit_catalog")
      .insert({
        organization_id: organization.id,
        benefit_key: def.key,
        category: def.category,
        value_type: def.valueType,
        monthly_value: def.defaultMonthlyValue ?? null,
        annual_value: def.defaultAnnualValue ?? null,
        display_order: rows.length,
      } as never)
      .select()
      .single();
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows([...rows, data as BenefitRow]);
    setAddingKey("");
  }

  async function addCustom() {
    if (!organization?.id) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const { data, error } = await supabase
      .from("org_benefit_catalog")
      .insert({
        organization_id: organization.id,
        benefit_key: `custom:${id}`,
        category: "financial_extra",
        value_type: "fixed",
        custom_label: "",
        annual_value: 0,
        display_order: rows.length,
      } as never)
      .select()
      .single();
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows([...rows, data as BenefitRow]);
  }

  async function update(id: string, patch: Partial<BenefitRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from("org_benefit_catalog")
      .update(patch as never)
      .eq("id", id);
    if (error) toast.error("Erreur de sauvegarde");
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from("org_benefit_catalog")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const availablePresets = BENEFIT_CATALOG.filter(
    (b) => !rows.find((r) => r.benefit_key === b.key),
  );

  return (
    <Card>
      <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
        Avantages proposés
      </h2>
      <p className="text-[12px] text-grey mb-4">
        Les avantages que votre entreprise propose. Ils seront pré-cochés à
        chaque création de package — vous pourrez les ajuster au cas par cas.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-grey text-[12px]">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {rows.map((r) => {
              const def = BENEFIT_CATALOG.find((b) => b.key === r.benefit_key);
              const isCustom = r.benefit_key.startsWith("custom:");
              const label = isCustom
                ? r.custom_label ?? ""
                : def?.label ?? r.benefit_key;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 bg-[#FAF8F5] border border-[rgba(45,38,64,0.08)] rounded-lg px-3 py-2"
                >
                  {isCustom ? (
                    <input
                      value={r.custom_label ?? ""}
                      onChange={(e) =>
                        update(r.id, { custom_label: e.target.value })
                      }
                      placeholder="Libellé de l'avantage"
                      className="flex-1 text-[13px] px-2 py-1 rounded border border-[rgba(45,38,64,0.12)] bg-white"
                    />
                  ) : (
                    <div className="flex-1 text-[13px] text-aubergine truncate">
                      {def?.icon} {label}
                      <span className="text-[10px] text-grey ml-2">
                        {CATEGORY_LABELS[r.category]}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={r.monthly_value ?? ""}
                      onChange={(e) =>
                        update(r.id, {
                          monthly_value: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      placeholder="0"
                      className="w-20 text-[12px] px-2 py-1 rounded border border-[rgba(45,38,64,0.12)] bg-white"
                    />
                    <span className="text-[10px] text-grey">€/mois</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={r.annual_value ?? ""}
                      onChange={(e) =>
                        update(r.id, {
                          annual_value: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      placeholder="0"
                      className="w-24 text-[12px] px-2 py-1 rounded border border-[rgba(45,38,64,0.12)] bg-white"
                    />
                    <span className="text-[10px] text-grey">€/an</span>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-grey hover:text-danger px-1"
                    aria-label="Supprimer"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="text-[12px] text-grey italic">
                Aucun avantage configuré. Ajoutez ceux que vous proposez à vos
                salariés.
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={addingKey}
              onChange={(e) => setAddingKey(e.target.value)}
              className={`${inputCls} max-w-xs`}
            >
              <option value="">Choisir un avantage du catalogue…</option>
              {availablePresets.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.icon} {b.label} — {CATEGORY_LABELS[b.category]}
                </option>
              ))}
            </select>
            <button
              onClick={addPreset}
              disabled={!addingKey}
              className="text-[12px] inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-aubergine text-lin disabled:opacity-40"
            >
              <Plus size={12} /> Ajouter
            </button>
            <button
              onClick={addCustom}
              className="text-[12px] inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-aubergine text-aubergine"
            >
              + Sur mesure
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ============================================================
 *  Equity
 * ============================================================ */

interface EquityRow {
  id: string;
  type: EquityType;
  vesting_years: number;
  cliff_months: number;
  default_strike_price: number;
  default_valuation_m: number;
  special_conditions: string | null;
  display_order: number;
}

function EquityCatalogCard() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<EquityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("org_equity_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");
      setRows((data ?? []) as EquityRow[]);
      setLoading(false);
    })();
  }, [organization?.id]);

  async function add(type: EquityType) {
    if (!organization?.id) return;
    if (rows.find((r) => r.type === type)) {
      toast.error("Déjà dans le catalogue");
      return;
    }
    const { data, error } = await supabase
      .from("org_equity_catalog")
      .insert({
        organization_id: organization.id,
        type,
        vesting_years: 4,
        cliff_months: 6,
        default_strike_price: 0,
        default_valuation_m: 0,
        display_order: rows.length,
      } as never)
      .select()
      .single();
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows([...rows, data as EquityRow]);
  }

  async function update(id: string, patch: Partial<EquityRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from("org_equity_catalog")
      .update(patch as never)
      .eq("id", id);
    if (error) toast.error("Erreur de sauvegarde");
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from("org_equity_catalog")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const available = EQUITY_TYPES.filter(
    (t) => !rows.find((r) => r.type === t.value),
  );

  return (
    <Card>
      <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
        Dispositifs d'equity disponibles
      </h2>
      <p className="text-[12px] text-grey mb-4">
        Configurez une fois pour toutes les instruments d'equity de votre
        entreprise (vesting, cliff, prix d'exercice). Vous n'aurez plus qu'à
        renseigner la quantité dans chaque package.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-grey text-[12px]">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {rows.map((r) => {
              const meta = EQUITY_TYPES.find((t) => t.value === r.type)!;
              return (
                <div
                  key={r.id}
                  className="bg-[#FAF8F5] border border-[rgba(45,38,64,0.08)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-aubergine text-[13px]">
                      {meta.label}
                    </div>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-grey hover:text-danger"
                      aria-label="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <NumField
                      label="Vesting (années)"
                      value={r.vesting_years}
                      onChange={(v) => update(r.id, { vesting_years: v })}
                    />
                    <NumField
                      label="Cliff (mois)"
                      value={r.cliff_months}
                      onChange={(v) => update(r.id, { cliff_months: v })}
                    />
                    <NumField
                      label="Prix d'exercice (€)"
                      value={r.default_strike_price}
                      onChange={(v) =>
                        update(r.id, { default_strike_price: v })
                      }
                    />
                    <NumField
                      label="Valorisation (M€)"
                      value={r.default_valuation_m}
                      onChange={(v) =>
                        update(r.id, { default_valuation_m: v })
                      }
                    />
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="text-[12px] text-grey italic">
                Aucun dispositif configuré.
              </p>
            )}
          </div>

          {available.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {available.map((t) => (
                <button
                  key={t.value}
                  onClick={() => add(t.value)}
                  className="text-[12px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-aubergine text-aubergine hover:bg-aubergine hover:text-white transition-colors"
                >
                  <Plus size={11} /> {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ============================================================
 *  Épargne salariale
 * ============================================================ */

interface SavingsRow {
  id: string;
  type: SavingsType;
  default_matching_rate: number | null;
  default_cap_amount: number | null;
  default_avg_3y: number | null;
  display_order: number;
}

function SavingsCatalogCard() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<SavingsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("org_savings_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");
      setRows((data ?? []) as SavingsRow[]);
      setLoading(false);
    })();
  }, [organization?.id]);

  async function add(type: SavingsType) {
    if (!organization?.id) return;
    if (rows.find((r) => r.type === type)) {
      toast.error("Déjà dans le catalogue");
      return;
    }
    const { data, error } = await supabase
      .from("org_savings_catalog")
      .insert({
        organization_id: organization.id,
        type,
        default_matching_rate: 0,
        default_cap_amount: 0,
        display_order: rows.length,
      } as never)
      .select()
      .single();
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows([...rows, data as SavingsRow]);
  }

  async function update(id: string, patch: Partial<SavingsRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from("org_savings_catalog")
      .update(patch as never)
      .eq("id", id);
    if (error) toast.error("Erreur de sauvegarde");
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from("org_savings_catalog")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const available = SAVINGS_TYPES.filter(
    (t) => !rows.find((r) => r.type === t.value),
  );

  return (
    <Card>
      <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
        Épargne salariale disponible
      </h2>
      <p className="text-[12px] text-grey mb-4">
        Dispositifs d'épargne salariale en place dans votre entreprise et leurs
        paramètres par défaut.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-grey text-[12px]">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {rows.map((r) => {
              const meta = SAVINGS_TYPES.find((t) => t.value === r.type)!;
              const isMatching = r.type === "pee" || r.type === "perco";
              return (
                <div
                  key={r.id}
                  className="bg-[#FAF8F5] border border-[rgba(45,38,64,0.08)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-aubergine text-[13px]">
                      {meta.label}
                    </div>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-grey hover:text-danger"
                      aria-label="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {isMatching ? (
                    <div className="grid grid-cols-2 gap-2">
                      <NumField
                        label="Abondement (%)"
                        value={r.default_matching_rate ?? 0}
                        onChange={(v) =>
                          update(r.id, { default_matching_rate: v })
                        }
                      />
                      <NumField
                        label="Plafond annuel (€)"
                        value={r.default_cap_amount ?? 0}
                        onChange={(v) =>
                          update(r.id, { default_cap_amount: v })
                        }
                      />
                    </div>
                  ) : (
                    <NumField
                      label="Montant moyen 3 ans (€)"
                      value={r.default_avg_3y ?? 0}
                      onChange={(v) => update(r.id, { default_avg_3y: v })}
                    />
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="text-[12px] text-grey italic">
                Aucun dispositif configuré.
              </p>
            )}
          </div>

          {available.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {available.map((t) => (
                <button
                  key={t.value}
                  onClick={() => add(t.value)}
                  className="text-[12px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-aubergine text-aubergine hover:bg-aubergine hover:text-white transition-colors"
                >
                  <Plus size={11} /> {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-[10px] text-grey mb-0.5">{label}</div>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full text-[12px] px-2 py-1.5 rounded border border-[rgba(45,38,64,0.12)] bg-white"
        placeholder="0"
      />
    </label>
  );
}

export function OrgCatalogSections() {
  return (
    <>
      <BenefitsCatalogCard />
      <EquityCatalogCard />
      <SavingsCatalogCard />
    </>
  );
}
