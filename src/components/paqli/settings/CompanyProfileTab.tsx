import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection } from "./SettingsSection";

/* -------------------------------------------------------------
 *  Types & defaults
 * ----------------------------------------------------------- */

interface RemoteEquipment {
  laptop?: boolean;
  screen?: boolean;
  keyboard?: boolean;
  chair?: boolean;
  desk?: boolean;
  internet?: boolean;
  amount?: number | null;
}

export interface CompanyProfile {
  // Identité
  legal_name: string;
  brand_name: string;
  website: string;
  size_range: string;
  industry: string;
  founding_year: number | null;
  stage: string;
  description: string;
  collective_agreement: string;
  working_time_regime: string;
  weekly_hours: number;

  // Santé
  health_insurance_provider: string;
  health_insurance_employer_rate: number | null;
  health_insurance_level: string;
  health_insurance_family: boolean;
  provident_fund_enabled: boolean;
  provident_fund_details: string;

  // Quotidien
  meal_voucher_enabled: boolean;
  meal_voucher_daily_amount: number | null;
  meal_voucher_employer_rate: number | null;
  meal_voucher_provider: string;
  transport_reimbursement_rate: number;
  mobility_package_amount: number | null;
  company_car_policy: string;
  works_council_enabled: boolean;
  works_council_benefits: string;
  holiday_vouchers_amount: number | null;
  culture_vouchers_amount: number | null;

  // Télétravail
  remote_work_policy: string;
  remote_work_days_per_week: number;
  remote_work_equipment: RemoteEquipment;

  // Congés
  rtt_days_per_year: number;
  extra_leave_seniority: boolean;
  extra_leave_details: string;
  family_events_leave: string;
  bonus_days_off: string;

  // Épargne
  profit_sharing_enabled: boolean;
  incentive_enabled: boolean;
  incentive_average_amount: number | null;
  pee_enabled: boolean;
  perco_enabled: boolean;
  employer_match_rate: number | null;
  mandatory_per_enabled: boolean;
  mandatory_per_details: string;

  // Rémunération
  salary_review_frequency: string;
  salary_review_criteria: string;
  salary_freeze_months: number;
  referral_program_enabled: boolean;
  referral_bonus_amount: number | null;

  // Formation
  training_budget_per_person: number | null;
  training_policy: string;
  certifications_covered: boolean;
  conferences_covered: boolean;
}

const empty: CompanyProfile = {
  legal_name: "",
  brand_name: "",
  website: "",
  size_range: "",
  industry: "",
  founding_year: null,
  stage: "",
  description: "",
  collective_agreement: "",
  working_time_regime: "",
  weekly_hours: 35,

  health_insurance_provider: "",
  health_insurance_employer_rate: null,
  health_insurance_level: "",
  health_insurance_family: false,
  provident_fund_enabled: false,
  provident_fund_details: "",

  meal_voucher_enabled: false,
  meal_voucher_daily_amount: null,
  meal_voucher_employer_rate: null,
  meal_voucher_provider: "",
  transport_reimbursement_rate: 50,
  mobility_package_amount: null,
  company_car_policy: "",
  works_council_enabled: false,
  works_council_benefits: "",
  holiday_vouchers_amount: null,
  culture_vouchers_amount: null,

  remote_work_policy: "",
  remote_work_days_per_week: 0,
  remote_work_equipment: {},

  rtt_days_per_year: 0,
  extra_leave_seniority: false,
  extra_leave_details: "",
  family_events_leave: "",
  bonus_days_off: "",

  profit_sharing_enabled: false,
  incentive_enabled: false,
  incentive_average_amount: null,
  pee_enabled: false,
  perco_enabled: false,
  employer_match_rate: null,
  mandatory_per_enabled: false,
  mandatory_per_details: "",

  salary_review_frequency: "",
  salary_review_criteria: "",
  salary_freeze_months: 0,
  referral_program_enabled: false,
  referral_bonus_amount: null,

  training_budget_per_person: null,
  training_policy: "",
  certifications_covered: false,
  conferences_covered: false,
};

/* -------------------------------------------------------------
 *  Completion scoring
 * ----------------------------------------------------------- */

function pct(filled: number, total: number) {
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

function scoreIdentity(p: CompanyProfile): number {
  const fields = [
    p.legal_name,
    p.brand_name,
    p.website,
    p.size_range,
    p.industry,
    p.stage,
    p.description,
    p.collective_agreement,
    p.working_time_regime,
  ];
  const filled = fields.filter((f) => !!String(f ?? "").trim()).length;
  return pct(filled, fields.length);
}
function scoreHealth(p: CompanyProfile): number {
  const fields = [
    p.health_insurance_provider,
    p.health_insurance_employer_rate != null ? "x" : "",
    p.health_insurance_level,
    p.provident_fund_enabled ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}
function scoreDaily(p: CompanyProfile): number {
  const fields = [
    p.meal_voucher_enabled ? "x" : "",
    p.transport_reimbursement_rate >= 50 ? "x" : "",
    p.mobility_package_amount != null ? "x" : "",
    p.company_car_policy,
    p.works_council_enabled ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}
function scoreRemote(p: CompanyProfile): number {
  const eq = p.remote_work_equipment ?? {};
  const eqCount = Object.values(eq).filter((v) => v === true).length;
  const fields = [
    p.remote_work_policy,
    p.remote_work_days_per_week > 0 || p.remote_work_policy === "aucun" ? "x" : "",
    eqCount > 0 ? "x" : "",
    eq.amount && Number(eq.amount) > 0 ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}
function scoreSavings(p: CompanyProfile): number {
  const fields = [
    p.profit_sharing_enabled ? "x" : "",
    p.incentive_enabled ? "x" : "",
    p.pee_enabled ? "x" : "",
    p.perco_enabled ? "x" : "",
    p.employer_match_rate != null ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}
function scoreTraining(p: CompanyProfile): number {
  const fields = [
    p.training_budget_per_person != null ? "x" : "",
    p.training_policy,
    p.certifications_covered ? "x" : "",
    p.conferences_covered ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}

function scoreLeaves(p: CompanyProfile): number {
  const fields = [
    p.rtt_days_per_year > 0 ? "x" : "",
    p.extra_leave_seniority ? "x" : "",
    p.family_events_leave,
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}
function scoreComp(p: CompanyProfile): number {
  const fields = [
    p.salary_review_frequency,
    p.salary_review_criteria,
    p.referral_program_enabled ? "x" : "",
  ];
  return pct(fields.filter(Boolean).length, fields.length);
}

function computeCompleteness(p: CompanyProfile) {
  // Weights per spec
  const sections = [
    { key: "identity", w: 20, score: scoreIdentity(p) },
    { key: "health", w: 20, score: scoreHealth(p) },
    { key: "daily", w: 15, score: scoreDaily(p) },
    { key: "remote", w: 15, score: scoreRemote(p) },
    { key: "savings", w: 15, score: scoreSavings(p) },
    { key: "training", w: 15, score: scoreTraining(p) },
  ];
  const total = sections.reduce((s, x) => s + (x.score * x.w) / 100, 0);
  return {
    global: Math.round(total),
    perSection: {
      identity: sections[0].score,
      health: sections[1].score,
      daily: sections[2].score,
      remote: sections[3].score,
      savings: sections[4].score,
      training: sections[5].score,
      leaves: scoreLeaves(p),
      comp: scoreComp(p),
    },
  };
}

/* -------------------------------------------------------------
 *  Form primitives
 * ----------------------------------------------------------- */

const inputCls =
  "w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.15)] rounded px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-aubergine transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-aubergine font-medium mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-grey mt-1">{hint}</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left py-1.5"
    >
      <span
        className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-aubergine" : "bg-[#D6D2CC]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      <span className="text-[13px] text-aubergine">{label}</span>
    </button>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-aubergine"
      />
      <span className="text-[12px] font-medium text-aubergine min-w-[48px] text-right tabular-nums">
        {value}
        {suffix}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------
 *  Completeness bar
 * ----------------------------------------------------------- */

function CompletenessBar({ score }: { score: number }) {
  const msg =
    score < 40
      ? "Paq manque d'informations pour aider vos candidats"
      : score < 70
        ? "Bon début — complétez encore pour des réponses plus précises"
        : "Excellent — Paq peut répondre à la grande majorité des questions";
  return (
    <div className="bg-white border-[0.5px] border-[rgba(45,38,64,0.08)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-medium text-aubergine">
          Profil de votre entreprise
        </div>
        <div className="font-display text-aubergine text-[22px] leading-none tabular-nums">
          {score}%
        </div>
      </div>
      <div className="h-2 bg-[#F0EBE8] rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-aubergine rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[11px] text-grey font-light">{msg}</p>
    </div>
  );
}

/* -------------------------------------------------------------
 *  Main component
 * ----------------------------------------------------------- */

export function CompanyProfileTab() {
  const { organization } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Load existing profile
  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("company_profile")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setProfile({
          ...empty,
          ...data,
          remote_work_equipment:
            (data.remote_work_equipment as RemoteEquipment | null) ?? {},
        });
      }
      setLoading(false);
      // allow autosave on subsequent renders
      setTimeout(() => {
        isFirstLoad.current = false;
      }, 100);
    })();
  }, [organization?.id]);

  // Debounced autosave
  useEffect(() => {
    if (loading || isFirstLoad.current || !organization?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { completeness } = { completeness: computeCompleteness(profile).global };
      const payload = {
        ...profile,
        organization_id: organization.id,
        completion_score: completeness,
      };
      const client = supabase as any;
      if (rowId) {
        const { error } = await client
          .from("company_profile")
          .update(payload)
          .eq("id", rowId);
        if (error) toast.error("Erreur de sauvegarde");
        else toast.success("Profil mis à jour", { duration: 1500 });
      } else {
        const { data, error } = await client
          .from("company_profile")
          .insert(payload)
          .select("id")
          .single();
        if (error) toast.error("Erreur de sauvegarde");
        else {
          setRowId(data.id);
          toast.success("Profil mis à jour", { duration: 1500 });
        }
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, organization?.id, rowId]);

  const { global: globalScore } = useMemo(() => computeCompleteness(profile), [profile]);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const setEq = (key: keyof RemoteEquipment, value: boolean | number | null) =>
    setProfile((p) => ({
      ...p,
      remote_work_equipment: { ...p.remote_work_equipment, [key]: value },
    }));

  if (loading) {
    return (
      <div className="px-7 py-12 flex items-center gap-2 text-grey">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl space-y-3">
      <CompletenessBar score={globalScore} />

      {/* ---------- 1. Identité ---------- */}
      <SettingsSection title="Identité de l'entreprise" icon="📋" defaultOpen>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom légal">
              <input
                value={profile.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nom de marque">
              <input
                value={profile.brand_name}
                onChange={(e) => set("brand_name", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Site web">
            <input
              type="url"
              value={profile.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Taille">
              <select
                value={profile.size_range}
                onChange={(e) => set("size_range", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </Field>
            <Field label="Secteur">
              <select
                value={profile.industry}
                onChange={(e) => set("industry", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="saas_b2b">SaaS B2B</option>
                <option value="fintech">Fintech</option>
                <option value="deeptech">Deeptech</option>
                <option value="healthtech">Healthtech</option>
                <option value="ecommerce">E-commerce</option>
                <option value="media">Média</option>
                <option value="conseil">Conseil</option>
                <option value="industrie">Industrie</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Stade">
              <select
                value={profile.stage}
                onChange={(e) => set("stage", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="bootstrap">Bootstrappé</option>
                <option value="seed">Seed</option>
                <option value="serie_a">Série A</option>
                <option value="serie_b_plus">Série B+</option>
                <option value="ipo">Coté en bourse</option>
                <option value="profitable">Rentable</option>
              </select>
            </Field>
          </div>
          <Field
            label="Présentation courte"
            hint="Utilisé par Paq pour contextualiser les échanges avec les candidats"
          >
            <textarea
              value={profile.description}
              onChange={(e) => set("description", e.target.value.slice(0, 280))}
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <span className="block text-[10px] text-grey mt-1 text-right">
              {profile.description.length}/280
            </span>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Convention collective">
              <input
                list="cc-suggestions"
                value={profile.collective_agreement}
                onChange={(e) => set("collective_agreement", e.target.value)}
                placeholder="ex : Syntec"
                className={inputCls}
              />
              <datalist id="cc-suggestions">
                <option value="Syntec" />
                <option value="Métallurgie" />
                <option value="HCR" />
                <option value="Convention nationale du commerce" />
              </datalist>
            </Field>
            <Field label="Régime horaire">
              <select
                value={profile.working_time_regime}
                onChange={(e) => {
                  const v = e.target.value;
                  set("working_time_regime", v);
                  if (v === "35h") set("weekly_hours", 35);
                  if (v === "39h") set("weekly_hours", 39);
                }}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="35h">35h</option>
                <option value="39h">39h</option>
                <option value="forfait_jours">Forfait jours</option>
              </select>
            </Field>
          </div>
        </div>
      </SettingsSection>

      {/* ---------- 2. Santé ---------- */}
      <SettingsSection title="Santé & Prévoyance" icon="🏥">
        <div className="space-y-4">
          <Toggle
            checked={!!profile.health_insurance_provider || profile.health_insurance_employer_rate != null}
            onChange={(v) => {
              if (!v) {
                set("health_insurance_provider", "");
                set("health_insurance_employer_rate", null);
                set("health_insurance_level", "");
                set("health_insurance_family", false);
              } else {
                set("health_insurance_employer_rate", 60);
              }
            }}
            label="Mutuelle d'entreprise proposée"
          />
          {(profile.health_insurance_employer_rate != null ||
            profile.health_insurance_provider) && (
            <div className="pl-12 space-y-3">
              <Field label="Prestataire">
                <input
                  value={profile.health_insurance_provider}
                  onChange={(e) => set("health_insurance_provider", e.target.value)}
                  placeholder="Alan, Henner, Malakoff…"
                  className={inputCls}
                />
              </Field>
              <Field label="Prise en charge employeur">
                <Slider
                  value={profile.health_insurance_employer_rate ?? 50}
                  min={50}
                  max={100}
                  onChange={(v) => set("health_insurance_employer_rate", v)}
                  suffix="%"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Niveau de couverture">
                  <select
                    value={profile.health_insurance_level}
                    onChange={(e) => set("health_insurance_level", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    <option value="base">Base</option>
                    <option value="intermediaire">Intermédiaire</option>
                    <option value="premium">Premium</option>
                  </select>
                </Field>
                <div className="flex items-end">
                  <Toggle
                    checked={profile.health_insurance_family}
                    onChange={(v) => set("health_insurance_family", v)}
                    label="Famille couverte"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="border-t border-[rgba(45,38,64,0.06)] pt-3">
            <Toggle
              checked={profile.provident_fund_enabled}
              onChange={(v) => set("provident_fund_enabled", v)}
              label="Prévoyance complémentaire"
            />
            {profile.provident_fund_enabled && (
              <div className="pl-12 mt-3">
                <Field label="Détails de la couverture">
                  <textarea
                    value={profile.provident_fund_details}
                    onChange={(e) => set("provident_fund_details", e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ---------- 3. Avantages quotidiens ---------- */}
      <SettingsSection title="Avantages quotidiens" icon="🍽️">
        <div className="space-y-4">
          <Toggle
            checked={profile.meal_voucher_enabled}
            onChange={(v) => set("meal_voucher_enabled", v)}
            label="Tickets restaurant"
          />
          {profile.meal_voucher_enabled && (
            <div className="pl-12 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valeur faciale (€)">
                  <input
                    type="number"
                    value={profile.meal_voucher_daily_amount ?? ""}
                    onChange={(e) =>
                      set(
                        "meal_voucher_daily_amount",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="10"
                    className={inputCls}
                  />
                </Field>
                <Field label="Prestataire">
                  <select
                    value={profile.meal_voucher_provider}
                    onChange={(e) => set("meal_voucher_provider", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    <option value="swile">Swile</option>
                    <option value="edenred">Edenred</option>
                    <option value="sodexo">Sodexo</option>
                    <option value="up">Up</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
              </div>
              <Field label="Part employeur">
                <Slider
                  value={profile.meal_voucher_employer_rate ?? 50}
                  min={50}
                  max={60}
                  onChange={(v) => set("meal_voucher_employer_rate", v)}
                  suffix="%"
                />
              </Field>
            </div>
          )}
          <div className="border-t border-[rgba(45,38,64,0.06)] pt-3 space-y-3">
            <Field label="Remboursement transport">
              <Slider
                value={profile.transport_reimbursement_rate}
                min={50}
                max={100}
                onChange={(v) => set("transport_reimbursement_rate", v)}
                suffix="%"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Forfait mobilité durable (€/an)">
                <input
                  type="number"
                  value={profile.mobility_package_amount ?? ""}
                  onChange={(e) =>
                    set(
                      "mobility_package_amount",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  placeholder="500"
                  className={inputCls}
                />
              </Field>
              <Field label="Voiture de fonction">
                <select
                  value={profile.company_car_policy}
                  onChange={(e) => set("company_car_policy", e.target.value)}
                  className={inputCls}
                >
                  <option value="">—</option>
                  <option value="aucun">Aucune</option>
                  <option value="selon_poste">Selon le poste</option>
                  <option value="systematique">Systématique</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="border-t border-[rgba(45,38,64,0.06)] pt-3">
            <Toggle
              checked={profile.works_council_enabled}
              onChange={(v) => set("works_council_enabled", v)}
              label="Comité d'entreprise ou avantages équivalents"
            />
            {profile.works_council_enabled && (
              <div className="pl-12 mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Chèques vacances (€/an)">
                    <input
                      type="number"
                      value={profile.holiday_vouchers_amount ?? ""}
                      onChange={(e) =>
                        set(
                          "holiday_vouchers_amount",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Chèques culture/CESU (€/an)">
                    <input
                      type="number"
                      value={profile.culture_vouchers_amount ?? ""}
                      onChange={(e) =>
                        set(
                          "culture_vouchers_amount",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Description libre">
                  <textarea
                    value={profile.works_council_benefits}
                    onChange={(e) => set("works_council_benefits", e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ---------- 4. Télétravail ---------- */}
      <SettingsSection title="Télétravail & Équipement" icon="🏠">
        <div className="space-y-4">
          <Field label="Politique générale">
            <select
              value={profile.remote_work_policy}
              onChange={(e) => set("remote_work_policy", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="aucun">Aucun</option>
              <option value="flexible">Flexible</option>
              <option value="hybrid_fixe">Hybride fixe</option>
              <option value="full_remote">Full remote</option>
            </select>
          </Field>
          {profile.remote_work_policy && profile.remote_work_policy !== "aucun" && (
            <Field label="Jours par semaine">
              <Slider
                value={profile.remote_work_days_per_week}
                min={1}
                max={5}
                onChange={(v) => set("remote_work_days_per_week", v)}
                suffix=" j"
              />
            </Field>
          )}
          <div>
            <div className="text-[12px] text-aubergine font-medium mb-2">
              Équipement fourni
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["laptop", "Laptop"],
                  ["screen", "Écran externe"],
                  ["keyboard", "Clavier/souris"],
                  ["chair", "Chaise ergonomique"],
                  ["desk", "Bureau"],
                  ["internet", "Forfait internet"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-[13px] text-aubergine">
                  <input
                    type="checkbox"
                    checked={!!profile.remote_work_equipment?.[k]}
                    onChange={(e) => setEq(k, e.target.checked)}
                    className="accent-aubergine"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <Field label="Budget home office (€ à l'embauche)">
            <input
              type="number"
              value={profile.remote_work_equipment?.amount ?? ""}
              onChange={(e) =>
                setEq("amount", e.target.value ? Number(e.target.value) : null)
              }
              placeholder="500"
              className={inputCls}
            />
          </Field>
        </div>
      </SettingsSection>

      {/* ---------- 5. Congés ---------- */}
      <SettingsSection title="Congés & Temps de travail" icon="🌴">
        <div className="space-y-4">
          <Field label="RTT annuels">
            <input
              type="number"
              value={profile.rtt_days_per_year}
              onChange={(e) => set("rtt_days_per_year", Number(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
          <Toggle
            checked={profile.extra_leave_seniority}
            onChange={(v) => set("extra_leave_seniority", v)}
            label="Jours de congés supplémentaires selon ancienneté"
          />
          {profile.extra_leave_seniority && (
            <div className="pl-12">
              <Field label="Détails">
                <textarea
                  value={profile.extra_leave_details}
                  onChange={(e) => set("extra_leave_details", e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}
          <Field label="Congés événements familiaux">
            <textarea
              value={profile.family_events_leave}
              onChange={(e) => set("family_events_leave", e.target.value)}
              rows={2}
              placeholder="mariage, naissance, déménagement…"
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Jours offerts">
            <textarea
              value={profile.bonus_days_off}
              onChange={(e) => set("bonus_days_off", e.target.value)}
              rows={2}
              placeholder="ex : Pont du 8 mai offert"
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </SettingsSection>

      {/* ---------- 6. Épargne ---------- */}
      <SettingsSection title="Épargne salariale" icon="💰">
        <div className="space-y-3">
          <Toggle
            checked={profile.profit_sharing_enabled}
            onChange={(v) => set("profit_sharing_enabled", v)}
            label="Participation légale"
          />
          <Toggle
            checked={profile.incentive_enabled}
            onChange={(v) => set("incentive_enabled", v)}
            label="Intéressement"
          />
          {profile.incentive_enabled && (
            <div className="pl-12">
              <Field label="Montant moyen versé N-1 (€)">
                <input
                  type="number"
                  value={profile.incentive_average_amount ?? ""}
                  onChange={(e) =>
                    set(
                      "incentive_average_amount",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          )}
          <Toggle
            checked={profile.pee_enabled}
            onChange={(v) => set("pee_enabled", v)}
            label="PEE (Plan d'Épargne Entreprise)"
          />
          <Toggle
            checked={profile.perco_enabled}
            onChange={(v) => set("perco_enabled", v)}
            label="PERCO / PER Collectif"
          />
          {profile.perco_enabled && (
            <div className="pl-12">
              <Field label="Taux d'abondement employeur">
                <Slider
                  value={profile.employer_match_rate ?? 0}
                  min={0}
                  max={300}
                  onChange={(v) => set("employer_match_rate", v)}
                  suffix="%"
                />
              </Field>
            </div>
          )}
          <Toggle
            checked={profile.mandatory_per_enabled}
            onChange={(v) => set("mandatory_per_enabled", v)}
            label="PER obligatoire (ex-article 83)"
          />
          {profile.mandatory_per_enabled && (
            <div className="pl-12">
              <Field label="Description">
                <textarea
                  value={profile.mandatory_per_details}
                  onChange={(e) => set("mandatory_per_details", e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* ---------- 7. Politique de rémunération ---------- */}
      <SettingsSection title="Politique de rémunération" icon="📈">
        <div className="space-y-4">
          <Field label="Fréquence des révisions salariales">
            <select
              value={profile.salary_review_frequency}
              onChange={(e) => set("salary_review_frequency", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="annuel">Annuelle</option>
              <option value="semestriel">Semestrielle</option>
              <option value="au_merite">Au mérite</option>
              <option value="aucun">Aucune politique formalisée</option>
            </select>
          </Field>
          <Field label="Critères de révision">
            <textarea
              value={profile.salary_review_criteria}
              onChange={(e) => set("salary_review_criteria", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Gel salarial après embauche">
            <select
              value={String(profile.salary_freeze_months)}
              onChange={(e) => set("salary_freeze_months", Number(e.target.value))}
              className={inputCls}
            >
              <option value="0">Aucun</option>
              <option value="6">6 mois</option>
              <option value="12">12 mois</option>
            </select>
          </Field>
          <div className="border-t border-[rgba(45,38,64,0.06)] pt-3">
            <Toggle
              checked={profile.referral_program_enabled}
              onChange={(v) => set("referral_program_enabled", v)}
              label="Prime de cooptation"
            />
            {profile.referral_program_enabled && (
              <div className="pl-12 mt-3">
                <Field label="Montant (€)">
                  <input
                    type="number"
                    value={profile.referral_bonus_amount ?? ""}
                    onChange={(e) =>
                      set(
                        "referral_bonus_amount",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ---------- 8. Formation ---------- */}
      <SettingsSection title="Formation & Développement" icon="🎓">
        <div className="space-y-4">
          <Field label="Budget formation par personne et par an (€)">
            <input
              type="number"
              value={profile.training_budget_per_person ?? ""}
              onChange={(e) =>
                set(
                  "training_budget_per_person",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={inputCls}
            />
          </Field>
          <Toggle
            checked={profile.certifications_covered}
            onChange={(v) => set("certifications_covered", v)}
            label="Certifications prises en charge"
          />
          <Toggle
            checked={profile.conferences_covered}
            onChange={(v) => set("conferences_covered", v)}
            label="Conférences et événements pris en charge"
          />
          <Field label="Politique de formation">
            <textarea
              value={profile.training_policy}
              onChange={(e) => set("training_policy", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </SettingsSection>
    </div>
  );
}
