import { Link } from "@tanstack/react-router";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { useOrgCatalogs } from "@/lib/orgCatalog";
import { Chip, EduBanner, NumberField, WarnBanner } from "./fields";
import type { SavingsDeviceForm, SavingsType } from "@/lib/packageConfig";

const types: { value: SavingsType; label: string; icon: string }[] = [
  { value: "pee", label: "PEE", icon: "🏦" },
  { value: "perco", label: "PERCO", icon: "🌴" },
  { value: "interessement", label: "Intéressement", icon: "📈" },
  { value: "participation", label: "Participation", icon: "💰" },
];

function newDevice(
  type: SavingsType,
  defaults?: {
    default_matching_rate?: number | null;
    default_cap_amount?: number | null;
    default_avg_3y?: number | null;
  },
): SavingsDeviceForm {
  return {
    id: crypto.randomUUID(),
    type,
    matchingRate: defaults?.default_matching_rate ?? 0,
    capAmount: defaults?.default_cap_amount ?? 0,
    avg3y: defaults?.default_avg_3y ?? 0,
  };
}

export function Step3Savings() {
  const { config, patch } = usePackageConfig();
  const { savings: orgSavings } = useOrgCatalogs();
  const devices = config.savingsDevices;

  const catalogTypes = orgSavings.map((c) => c.type);
  const visibleTypes =
    catalogTypes.length > 0
      ? types.filter((t) => catalogTypes.includes(t.value))
      : types;

  const toggle = (t: SavingsType) => {
    const exists = devices.find((d) => d.type === t);
    if (exists) {
      patch({ savingsDevices: devices.filter((d) => d.type !== t) });
    } else {
      const cat = orgSavings.find((c) => c.type === t);
      patch({ savingsDevices: [...devices, newDevice(t, cat ?? undefined)] });
    }
  };
  const update = (id: string, p: Partial<SavingsDeviceForm>) =>
    patch({
      savingsDevices: devices.map((d) =>
        d.id === id ? { ...d, ...p } : d,
      ),
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Épargne salariale
        </h2>
        <p className="text-[12px] text-grey mt-1">
          {catalogTypes.length > 0
            ? "Sélectionnez les dispositifs proposés au candidat. Les paramètres par défaut viennent de votre catalogue entreprise."
            : "Étape optionnelle. Sélectionnez les dispositifs disponibles dans votre entreprise."}
        </p>
        {catalogTypes.length === 0 && (
          <p className="text-[11px] text-grey mt-1.5 italic">
            💡 Pour gagner du temps, configurez vos dispositifs d'épargne dans{" "}
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
            onClick={() => toggle(t.value)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="space-y-6">
        {devices.map((d) => (
          <SavingsBlock
            key={d.id}
            device={d}
            onChange={(p) => update(d.id, p)}
          />
        ))}
      </div>
    </div>
  );
}

function SavingsBlock({
  device,
  onChange,
}: {
  device: SavingsDeviceForm;
  onChange: (p: Partial<SavingsDeviceForm>) => void;
}) {
  const meta = types.find((t) => t.value === device.type)!;
  const isMatching = device.type === "pee" || device.type === "perco";
  const isAvg = device.type === "interessement" || device.type === "participation";

  return (
    <div className="rounded-[12px] border border-[rgba(45,38,64,0.08)] p-5 space-y-4 bg-[#FAF8F5]">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <h3 className="font-display text-aubergine" style={{ fontSize: 16 }}>
          {meta.label}
        </h3>
      </div>

      {isMatching && (
        <>
          <div>
            <div className="text-[12px] text-aubergine-light font-medium mb-1">
              Taux d'abondement employeur <span className="text-danger">*</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(device.type === "pee"
                ? [50, 100, 200, 300]
                : [50, 100, 150]
              ).map((r) => (
                <Chip
                  key={r}
                  selected={device.matchingRate === r}
                  onClick={() => onChange({ matchingRate: r })}
                >
                  {r}%
                </Chip>
              ))}
              <Chip
                selected={
                  device.matchingRate > 0 &&
                  ![50, 100, 150, 200, 300].includes(device.matchingRate)
                }
                onClick={() => onChange({ matchingRate: 75 })}
              >
                Personnalisé
              </Chip>
            </div>
            {device.matchingRate > 0 &&
              ![50, 100, 150, 200, 300].includes(device.matchingRate) && (
                <div className="mt-2 max-w-[160px]">
                  <NumberField
                    label="Taux personnalisé"
                    suffix="%"
                    value={device.matchingRate}
                    onChange={(v) => onChange({ matchingRate: v })}
                  />
                </div>
              )}
          </div>

          <NumberField
            label="Plafond d'abondement annuel"
            required
            suffix="€"
            value={device.capAmount}
            onChange={(v) => onChange({ capAmount: v })}
            placeholder={device.type === "pee" ? "3 200" : "2 000"}
            hint={
              device.type === "pee"
                ? "Plafond légal 2026 : 3 768 €"
                : "Plafond légal 2026 : 7 536 €"
            }
          />

          {device.type === "pee" ? (
            <EduBanner>
              Le PEE permet d'épargner avec l'aide de l'entreprise. Avec 300 %
              d'abondement : vous versez 1 000 €, l'entreprise ajoute 3 000 €.
              Les fonds sont bloqués 5 ans (sauf cas légaux de déblocage).
            </EduBanner>
          ) : (
            <EduBanner>
              Comme le PEE, mais les fonds sont destinés à la retraite.
              Déblocage à la retraite ou dans certains cas (achat résidence
              principale, invalidité…).
            </EduBanner>
          )}
        </>
      )}

      {isAvg && (
        <>
          <NumberField
            label="Montant moyen versé (3 dernières années)"
            required
            suffix="€"
            value={device.avg3y}
            onChange={(v) => onChange({ avg3y: v })}
            placeholder={device.type === "interessement" ? "4 200" : "2 800"}
            hint={
              device.type === "interessement"
                ? "Indiquez 0 si l'entreprise est récente."
                : "Obligatoire pour les entreprises de 50 salariés et plus."
            }
          />

          {device.type === "interessement" ? (
            <>
              <EduBanner>
                L'intéressement est lié aux résultats de l'entreprise. Si
                versé sur le PEE, il est exonéré d'impôt sur le revenu. Son
                montant peut varier d'une année à l'autre.
              </EduBanner>
              <WarnBanner>
                Le montant indiqué est une moyenne historique. L'intéressement
                n'est pas garanti : il peut être nul si les objectifs ne sont
                pas atteints.
              </WarnBanner>
            </>
          ) : (
            <EduBanner>
              La participation redistribue une part des bénéfices aux
              salariés. Comme l'intéressement, si versée sur le PEE, elle est
              exonérée d'impôt sur le revenu.
            </EduBanner>
          )}
        </>
      )}
    </div>
  );
}
