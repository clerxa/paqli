import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { formatEur } from "@/lib/clientCalc";

// Estimations 2026 — cadre standard. Pédagogique, pas un calcul juridique.
const EMPLOYER_BREAKDOWN = [
  { label: "Sécurité sociale & maladie", rate: 0.13 },
  { label: "Retraite (Sécu + complémentaire)", rate: 0.16 },
  { label: "Chômage & AGS", rate: 0.04 },
  { label: "Autres (formation, prévoyance, AT/MP…)", rate: 0.09 },
];
const EMPLOYEE_BREAKDOWN = [
  { label: "Sécurité sociale & maladie", rate: 0.07 },
  { label: "Retraite (Sécu + complémentaire)", rate: 0.11 },
  { label: "CSG / CRDS", rate: 0.03 },
  { label: "Chômage & autres", rate: 0.01 },
];

const EMPLOYER_TOTAL = EMPLOYER_BREAKDOWN.reduce((a, b) => a + b.rate, 0); // ~0.42
const EMPLOYEE_TOTAL = EMPLOYEE_BREAKDOWN.reduce((a, b) => a + b.rate, 0); // ~0.22

export function SalaryBreakdown({
  grossAnnual,
  pasRate,
  onPasRateChange,
}: {
  grossAnnual: number;
  pasRate: number; // 0..1
  onPasRateChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const brut = grossAnnual || 0;
  const superBrut = Math.round(brut * (1 + EMPLOYER_TOTAL));
  const net = Math.round(brut * (1 - EMPLOYEE_TOTAL));
  const netApresImpot = Math.round(net * (1 - pasRate));

  const employerCharges = superBrut - brut;
  const employeeCharges = brut - net;
  const tax = net - netApresImpot;

  return (
    <div className="rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] bg-white overflow-hidden">
      {/* Header always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-1.5 text-[13px] text-aubergine">
          <span style={{ color: "#8B7FA8" }}>●</span>
          Salaire fixe — du super brut au net après impôt
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-[14px] font-medium tabular-nums"
            style={{ color: "#2D2640" }}
          >
            ~{formatEur(netApresImpot)}
            <span className="text-[11px] text-grey ml-1">/ an net après impôt</span>
          </div>
          <ChevronDown
            size={14}
            className="text-grey transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Cascade des 4 montants */}
          <div className="rounded-[10px] p-4 space-y-3" style={{ background: "#F7F4EE" }}>
            <CascadeRow
              label="Super brut"
              sub="Coût total pour l'employeur"
              value={superBrut}
              valueColor="#633806"
              accent="#C4A882"
            />
            <Arrow note={`− ${formatEur(employerCharges)} de cotisations patronales (~${Math.round(EMPLOYER_TOTAL * 100)}%)`} />
            <CascadeRow
              label="Brut"
              sub="Montant inscrit sur le contrat"
              value={brut}
              valueColor="#2D2640"
              accent="#8B7FA8"
            />
            <Arrow note={`− ${formatEur(employeeCharges)} de cotisations salariales (~${Math.round(EMPLOYEE_TOTAL * 100)}%)`} />
            <CascadeRow
              label="Net avant impôt"
              sub="Ce qui apparaît sur la fiche de paie"
              value={net}
              valueColor="#2D2640"
              accent="#8B7FA8"
            />
            <Arrow note={`− ${formatEur(tax)} de prélèvement à la source (${Math.round(pasRate * 100)}%)`} />
            <CascadeRow
              label="Net après impôt"
              sub="Ce que vous touchez vraiment"
              value={netApresImpot}
              valueColor="#2D2640"
              accent="#5B8C7B"
              bold
            />
          </div>

          {/* PAS input */}
          <div className="rounded-[10px] p-4 border-[0.5px] border-[rgba(45,38,64,0.08)]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="text-[12px] text-aubergine font-medium">
                Votre taux de prélèvement à la source
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={45}
                  step={0.1}
                  value={Math.round(pasRate * 1000) / 10}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onPasRateChange(Math.max(0, Math.min(0.45, v / 100)));
                  }}
                  className="w-20 text-right tabular-nums text-[13px] border-[0.5px] border-[rgba(45,38,64,0.15)] rounded-md px-2 py-1"
                />
                <span className="text-[12px] text-grey">%</span>
              </div>
            </div>
            <p className="text-[11px] text-grey leading-relaxed">
              Vous trouvez votre taux personnalisé sur{" "}
              <a
                href="https://www.impots.gouv.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                impots.gouv.fr
              </a>{" "}
              (rubrique « Gérer mon prélèvement à la source »). Pré-rempli depuis votre TMI.
            </p>
          </div>

          {/* Détail cotisations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChargeBox
              title={`Cotisations patronales (~${Math.round(EMPLOYER_TOTAL * 100)}%)`}
              tone="employer"
              base={brut}
              items={EMPLOYER_BREAKDOWN}
              total={employerCharges}
              hint="Payées par l'employeur en plus du brut. Financent santé, retraite, chômage, formation."
            />
            <ChargeBox
              title={`Cotisations salariales (~${Math.round(EMPLOYEE_TOTAL * 100)}%)`}
              tone="employee"
              base={brut}
              items={EMPLOYEE_BREAKDOWN}
              total={employeeCharges}
              hint="Déduites de votre brut. Financent vos droits (retraite, santé, chômage)."
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-grey leading-relaxed">
            <Info size={12} className="mt-[2px] shrink-0" />
            <span>
              Estimation pédagogique pour un cadre du secteur privé (taux moyens 2026). Les taux réels varient selon la convention collective, la prévoyance, et la taille de l'entreprise.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CascadeRow({
  label,
  sub,
  value,
  valueColor,
  accent,
  bold,
}: {
  label: string;
  sub: string;
  value: number;
  valueColor: string;
  accent: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: accent }}
        />
        <div>
          <div
            className={`text-[13px] text-aubergine ${bold ? "font-semibold" : "font-medium"}`}
          >
            {label}
          </div>
          <div className="text-[11px] text-grey">{sub}</div>
        </div>
      </div>
      <div
        className={`tabular-nums ${bold ? "text-[16px] font-semibold" : "text-[14px] font-medium"}`}
        style={{ color: valueColor }}
      >
        {formatEur(value)}
      </div>
    </div>
  );
}

function Arrow({ note }: { note: string }) {
  return (
    <div className="flex items-center gap-2 pl-3 text-[11px]" style={{ color: "#8B7FA8" }}>
      <span className="inline-block w-px h-4" style={{ background: "#C4A882" }} />
      {note}
    </div>
  );
}

function ChargeBox({
  title,
  items,
  total,
  base,
  hint,
  tone,
}: {
  title: string;
  items: { label: string; rate: number }[];
  total: number;
  base: number;
  hint: string;
  tone: "employer" | "employee";
}) {
  const bg = tone === "employer" ? "#FAEEDA" : "#EFEEF6";
  const fg = tone === "employer" ? "#633806" : "#2D2640";
  return (
    <div className="rounded-[10px] p-3" style={{ background: bg }}>
      <div className="text-[12px] font-medium mb-2" style={{ color: fg }}>
        {title}
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-[11px]">
            <span style={{ color: fg, opacity: 0.85 }}>{it.label}</span>
            <span className="tabular-nums" style={{ color: fg }}>
              ~{formatEur(Math.round(base * it.rate))}
            </span>
          </div>
        ))}
        <div
          className="flex items-center justify-between text-[12px] font-medium pt-1.5 mt-1.5"
          style={{ borderTop: `0.5px solid ${fg}33`, color: fg }}
        >
          <span>Total</span>
          <span className="tabular-nums">~{formatEur(total)}</span>
        </div>
      </div>
      <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: fg, opacity: 0.75 }}>
        {hint}
      </p>
    </div>
  );
}
