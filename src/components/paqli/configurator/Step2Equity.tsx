import { Link } from "@tanstack/react-router";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { usePackageCoach } from "@/hooks/usePackageCoach";
import { CoachTipInline } from "@/components/paqli/CoachTipInline";
import { useOrgCatalogs } from "@/lib/orgCatalog";
import {
  Chip,
  EduBanner,
  NumberField,
  TextArea,
} from "./fields";
import type { EquityDeviceForm, EquityType } from "@/lib/packageConfig";

const types: { value: EquityType; label: string; icon: string }[] = [
  { value: "bspce", label: "BSPCE", icon: "📈" },
  { value: "aga", label: "AGA", icon: "🎁" },
  { value: "rsu", label: "RSU", icon: "📊" },
  { value: "stock_options", label: "Stock-options", icon: "📈" },
  { value: "espp", label: "ESPP", icon: "💼" },
];

function newDevice(
  type: EquityType,
  defaults?: {
    vesting_years?: number;
    cliff_months?: number;
    default_strike_price?: number;
    default_valuation_m?: number;
    special_conditions?: string | null;
  },
): EquityDeviceForm {
  return {
    id: crypto.randomUUID(),
    type,
    quantity: 0,
    strikePrice: defaults?.default_strike_price ?? 0,
    currentValuationM: defaults?.default_valuation_m ?? 0,
    vestingYears: defaults?.vesting_years ?? 4,
    cliffMonths: defaults?.cliff_months ?? 6,
    specialConditions: defaults?.special_conditions ?? "",
  };
}

export function Step2Equity() {
  const { config, patch } = usePackageConfig();
  const { equity: orgEquity } = useOrgCatalogs();
  const devices = config.equityDevices;

  // Types disponibles dans le catalogue de l'entreprise (s'il est configuré)
  const catalogTypes = orgEquity.map((c) => c.type);
  const visibleTypes =
    catalogTypes.length > 0
      ? types.filter((t) => catalogTypes.includes(t.value))
      : types;

  const toggleType = (t: EquityType) => {
    const exists = devices.find((d) => d.type === t);
    if (exists) {
      patch({ equityDevices: devices.filter((d) => d.type !== t) });
    } else {
      const cat = orgEquity.find((c) => c.type === t);
      patch({ equityDevices: [...devices, newDevice(t, cat ?? undefined)] });
    }
  };

  const updateDevice = (id: string, patchD: Partial<EquityDeviceForm>) => {
    patch({
      equityDevices: devices.map((d) =>
        d.id === id ? { ...d, ...patchD } : d,
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Equity
        </h2>
        <p className="text-[12px] text-grey mt-1">
          {catalogTypes.length > 0
            ? "Sélectionnez les dispositifs proposés au candidat. Les paramètres par défaut viennent de votre catalogue entreprise."
            : "Étape optionnelle. Sélectionnez les dispositifs proposés au candidat."}
        </p>
        {catalogTypes.length === 0 && (
          <p className="text-[11px] text-grey mt-1.5 italic">
            💡 Pour gagner du temps, configurez vos dispositifs d'equity dans{" "}
            <Link
              to="/settings"
              search={{ tab: "company" }}
              className="text-aubergine underline"
            >
              Paramètres → Mon entreprise
            </Link>
            .
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTypes.map((t) => (
          <Chip
            key={t.value}
            selected={devices.some((d) => d.type === t.value)}
            onClick={() => toggleType(t.value)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="space-y-6">
        {devices.map((d) => (
          <EquityBlock
            key={d.id}
            device={d}
            onChange={(p) => updateDevice(d.id, p)}
          />
        ))}
      </div>
    </div>
  );
}

function EquityBlock({
  device,
  onChange,
}: {
  device: EquityDeviceForm;
  onChange: (p: Partial<EquityDeviceForm>) => void;
}) {
  const meta = types.find((t) => t.value === device.type)!;
  const isOptionLike =
    device.type === "bspce" || device.type === "stock_options";
  const isShareLike = device.type === "aga" || device.type === "rsu";
  const { tips, checkField } = usePackageCoach();

  return (
    <div className="rounded-[12px] border border-[rgba(45,38,64,0.08)] p-5 space-y-4 bg-[#FAF8F5]">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <h3
          className="font-display text-aubergine"
          style={{ fontSize: 16 }}
        >
          {meta.label}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField
          label={isShareLike ? "Nombre d'actions" : "Nombre de bons"}
          required
          value={device.quantity}
          onChange={(v) => onChange({ quantity: v })}
          placeholder={isShareLike ? "500" : "10 000"}
        />
        {isOptionLike && (
          <NumberField
            label="Prix d'exercice"
            required
            suffix="€/bon"
            value={device.strikePrice}
            onChange={(v) => onChange({ strikePrice: v })}
            placeholder="1,20"
          />
        )}
        {device.type === "rsu" && (
          <NumberField
            label="Cours actuel de l'action"
            required
            suffix="€"
            value={device.strikePrice}
            onChange={(v) => onChange({ strikePrice: v })}
            placeholder="48,50"
            hint="Pour les entreprises cotées uniquement."
          />
        )}
      </div>

      <NumberField
        label="Valorisation actuelle de l'entreprise"
        required
        suffix="M€"
        value={device.currentValuationM}
        onChange={(v) => onChange({ currentValuationM: v })}
        placeholder="45"
        hint="Basée sur votre dernier tour de table."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            {isShareLike ? "Durée d'acquisition" : "Vesting"}
            <span className="text-danger"> *</span>
          </div>
          <div className="flex gap-2">
            {[isShareLike ? 1 : 3, isShareLike ? 2 : 4, isShareLike ? 3 : 5].map(
              (y) => (
                <Chip
                  key={y}
                  selected={device.vestingYears === y}
                  onClick={() => {
                    onChange({ vestingYears: y });
                    checkField("vesting_years", y);
                  }}
                >
                  {y} an{y > 1 ? "s" : ""}
                </Chip>
              ),
            )}
          </div>
          <CoachTipInline tip={tips["vesting_years"]} />
        </div>
        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            {isShareLike ? "Durée de conservation" : "Cliff"}
          </div>
          <div className="flex flex-wrap gap-2">
            {(isShareLike
              ? [
                  { v: 0, l: "0" },
                  { v: 12, l: "1 an" },
                  { v: 24, l: "2 ans" },
                ]
              : [
                  { v: 0, l: "Pas de cliff" },
                  { v: 6, l: "6 mois" },
                  { v: 12, l: "1 an" },
                ]
            ).map((c) => (
              <Chip
                key={c.v}
                selected={device.cliffMonths === c.v}
                onClick={() => {
                  onChange({ cliffMonths: c.v });
                  checkField("cliff_months", c.v);
                }}
              >
                {c.l}
              </Chip>
            ))}
          </div>
          <CoachTipInline tip={tips["cliff_months"]} />
        </div>
      </div>

      <TextArea
        label="Conditions particulières"
        value={device.specialConditions}
        onChange={(v) => onChange({ specialConditions: v })}
        placeholder="Ex : accélération en cas d'acquisition, clause good/bad leaver…"
      />

      {device.type === "bspce" && (
        <EduBanner>
          Les BSPCE permettent aux salariés d'acheter des actions à un prix
          fixé aujourd'hui. Leur valeur dépend de la croissance future de
          l'entreprise.
        </EduBanner>
      )}
      {device.type === "aga" && (
        <EduBanner>
          Les AGA sont des actions reçues gratuitement, sous condition de
          rester dans l'entreprise pendant la période d'acquisition.
        </EduBanner>
      )}
      {device.type === "rsu" && (
        <EduBanner>
          Les RSU sont des unités d'actions attribuées progressivement, et
          converties en vraies actions à la date d'acquisition.
        </EduBanner>
      )}
      {device.type === "stock_options" && (
        <EduBanner>
          Les stock-options permettent d'acheter des actions à un prix fixé
          aujourd'hui. La fiscalité diffère des BSPCE.
        </EduBanner>
      )}
      {device.type === "espp" && (
        <EduBanner>
          L'ESPP permet aux salariés d'acheter des actions de l'entreprise
          avec une décote, via des prélèvements sur salaire.
        </EduBanner>
      )}
    </div>
  );
}
