import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useBehaviorData, type BehaviorEvent, type BehaviorLink } from "@/hooks/useBehaviorData";
import { EngagementBadge } from "./EngagementBadge";
import { interpretBehaviorFn } from "@/lib/behaviorInterpret.functions";

interface Props {
  linkId: string;
}

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: "hero", label: "Présentation" },
  { id: "poste", label: "Le poste" },
  { id: "equipe_culture", label: "Équipe & culture" },
  { id: "simulation", label: "Simulation financière" },
  { id: "equity_scenarios", label: "Scénarios equity" },
  { id: "epargne", label: "Épargne salariale" },
  { id: "faq", label: "FAQ" },
  { id: "assistant_ia", label: "Assistant IA" },
  { id: "messagerie", label: "Messagerie" },
  { id: "decision", label: "Décision" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function labelColor(label: string | null): string {
  if (label === "hot") return "#3B6D11";
  if (label === "warm") return "#8B7FA8";
  if (label === "lukewarm") return "#C4A882";
  return "#D3D1C7";
}

export function BehaviorView({ linkId }: Props) {
  const { behaviors, link, loading } = useBehaviorData(linkId);

  if (loading || !link) {
    return (
      <div className="text-[12px] text-grey italic py-4">
        Chargement du comportement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EngagementHeader link={link} />
      <KeyStats link={link} behaviors={behaviors} />
      <TabsProgress behaviors={behaviors} />
      <SectionsTime behaviors={behaviors} />
      <ScenariosViewed behaviors={behaviors} />
      <TmiTested behaviors={behaviors} />
      <AIBehaviorInterpretation linkId={linkId} />
    </div>
  );
}

const TAB_LABELS: Record<string, string> = {
  tab_welcome: "Bienvenue",
  tab_package: "Package",
  tab_simulate: "Simulation",
  tab_scenarios: "Scénarios equity",
  tab_savings: "Épargne",
  tab_fit: "Équipe & culture",
  tab_process: "Process",
  tab_faq: "FAQ",
  tab_ask: "Échanger",
  tab_decision: "Ma décision",
  tab_next: "Ma décision",
};

function TabsProgress({ behaviors }: { behaviors: BehaviorEvent[] }) {
  const tabViews = behaviors.filter(
    (b) => b.event_type === "section_view" && b.section?.startsWith("tab_"),
  );
  const completed = behaviors.some(
    (b) =>
      b.event_type === "section_view" && b.section === "all_tabs_completed",
  );

  if (tabViews.length === 0 && !completed) return null;

  // Distinct tabs in order of first visit
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const b of tabViews) {
    const s = b.section!;
    if (!seen.has(s)) {
      seen.add(s);
      ordered.push(s);
    }
  }

  const timePerTab: Record<string, number> = {};
  behaviors
    .filter(
      (b) =>
        b.event_type === "section_time" && b.section?.startsWith("tab_"),
    )
    .forEach((b) => {
      timePerTab[b.section!] =
        (timePerTab[b.section!] ?? 0) + (b.duration_s ?? 0);
    });

  const totalTabTime = Object.values(timePerTab).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-medium text-aubergine-light">
          Parcours candidat ({ordered.length} onglet
          {ordered.length > 1 ? "s" : ""} vu{ordered.length > 1 ? "s" : ""})
        </div>
        <div
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            completed
              ? "bg-[#EAF3DE] text-[#27500A]"
              : "bg-[#F0EBE8] text-[#9B97A0]"
          }`}
        >
          {completed ? "✓ Parcours complété" : "En cours"}
        </div>
      </div>
      <div className="space-y-2">
        {ordered.map((tabId) => {
          const t = timePerTab[tabId] ?? 0;
          const pct = totalTabTime > 0 ? (t / totalTabTime) * 100 : 0;
          return (
            <div key={tabId} className="flex items-center gap-3">
              <div className="text-[12px] text-aubergine w-36 flex-shrink-0 font-light">
                ✓ {TAB_LABELS[tabId] ?? tabId.replace("tab_", "")}
              </div>
              <div className="flex-1 h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8B7FA8]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[11px] text-grey w-14 text-right">
                {t > 0 ? formatDuration(t) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngagementHeader({ link }: { link: BehaviorLink }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-[#F0EBE8] rounded-xl">
      <div className="flex-1">
        <div className="text-[12px] text-grey mb-2">
          Score d'engagement global
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${link.engagement_score ?? 0}%`,
              background: labelColor(link.engagement_label),
            }}
          />
        </div>
      </div>
      <EngagementBadge
        score={link.engagement_score ?? 0}
        label={link.engagement_label}
        intent={link.intent_prediction}
      />
    </div>
  );
}

function KeyStats({
  link,
  behaviors,
}: {
  link: BehaviorLink;
  behaviors: BehaviorEvent[];
}) {
  const simChanges = behaviors.filter((b) => b.event_type === "simulation_change").length;
  const visits = (link.return_visits ?? 0) + (link.opened_at ? 1 : 0);
  const totalTime = link.time_on_page_total ?? 0;

  const stats = [
    { label: "Visites", value: String(visits), icon: "👁" },
    { label: "Temps total", value: formatDuration(totalTime), icon: "⏱" },
    { label: "Simulations", value: String(simChanges), icon: "🔢" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-[rgba(45,38,64,0.08)] rounded-xl p-3 text-center"
        >
          <div className="text-xl mb-1">{s.icon}</div>
          <div className="font-display text-aubergine" style={{ fontSize: 20 }}>
            {s.value}
          </div>
          <div className="text-[11px] text-grey">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function SectionsTime({ behaviors }: { behaviors: BehaviorEvent[] }) {
  const timePerSection: Record<string, number> = {};
  behaviors
    .filter((b) => b.event_type === "section_time" && b.section)
    .forEach((b) => {
      timePerSection[b.section!] = (timePerSection[b.section!] ?? 0) + (b.duration_s ?? 0);
    });
  const sectionsViewed = new Set(
    behaviors
      .filter((b) => b.event_type === "section_view" && b.section)
      .map((b) => b.section as string),
  );
  const maxTime = Math.max(...Object.values(timePerSection), 1);

  return (
    <div>
      <div className="text-[12px] font-medium text-aubergine-light mb-3">
        Temps passé par section
      </div>
      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const sectionTime = timePerSection[section.id] ?? 0;
          const wasViewed = sectionsViewed.has(section.id);
          return (
            <div key={section.id} className="flex items-center gap-3">
              <div className="text-[12px] text-grey w-36 flex-shrink-0 font-light">
                {section.label}
              </div>
              <div className="flex-1 h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
                {wasViewed && (
                  <div
                    className="h-full rounded-full bg-[#8B7FA8]"
                    style={{ width: `${(sectionTime / maxTime) * 100}%` }}
                  />
                )}
              </div>
              <div className="text-[11px] text-grey w-14 text-right">
                {wasViewed ? formatDuration(sectionTime) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenariosViewed({ behaviors }: { behaviors: BehaviorEvent[] }) {
  const viewed = behaviors
    .filter((b) => b.event_type === "scenario_view")
    .map((b) => b.value);
  if (viewed.length === 0) return null;

  const ALL = ["pessimiste", "realiste", "optimiste"];
  return (
    <div>
      <div className="text-[12px] font-medium text-aubergine-light mb-2">
        Scénarios equity consultés
      </div>
      <div className="flex gap-2 flex-wrap">
        {ALL.map((s) => {
          const seen = viewed.includes(s);
          const cls = !seen
            ? "bg-[#F9F8F6] text-[#C4BDCE] border border-[rgba(45,38,64,0.06)]"
            : s === "optimiste"
              ? "bg-[#EAF3DE] text-[#27500A]"
              : s === "realiste"
                ? "bg-[#F5F2FA] text-[#6B5F88]"
                : "bg-[#F0EBE8] text-[#9B97A0]";
          return (
            <div
              key={s}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium ${cls}`}
            >
              {seen ? "✓" : "○"} {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TmiTested({ behaviors }: { behaviors: BehaviorEvent[] }) {
  const tmiValues = behaviors
    .filter(
      (b) =>
        b.event_type === "simulation_change" &&
        b.value &&
        b.value.startsWith("tmi:"),
    )
    .map((b) => b.value!.replace("tmi:", ""));
  if (tmiValues.length === 0) return null;

  const unique = Array.from(new Set(tmiValues));
  const ALL = ["0.11", "0.3", "0.41", "0.45"];

  return (
    <div>
      <div className="text-[12px] font-medium text-aubergine-light mb-2">
        Tranches d'imposition testées
      </div>
      <div className="flex gap-2 flex-wrap">
        {ALL.map((tmi) => {
          const tested = unique.some(
            (v) => Math.abs(parseFloat(v) - parseFloat(tmi)) < 0.001,
          );
          const cls = tested
            ? "bg-[#2D2640] text-[#FAF8F5]"
            : "bg-[#F0EBE8] text-[#9B97A0]";
          return (
            <div
              key={tmi}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium ${cls}`}
            >
              {Math.round(parseFloat(tmi) * 100)}%
            </div>
          );
        })}
      </div>
      {unique.length > 1 && (
        <div className="text-[11px] text-grey font-light mt-1.5">
          A testé {unique.length} TMI différentes — compare activement
        </div>
      )}
    </div>
  );
}

function AIBehaviorInterpretation({ linkId }: { linkId: string }) {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const interpret = useServerFn(interpretBehaviorFn);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await interpret({ data: { linkId } });
      setInterpretation(res.interpretation);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-[rgba(139,127,168,0.2)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#F5F2FA] border-b border-[rgba(139,127,168,0.1)]">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">✨</span>
          <span className="text-[12px] font-medium text-[#6B5F88]">
            Interprétation IA du comportement
          </span>
        </div>
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="text-[11px] font-medium text-[#8B7FA8] disabled:opacity-50"
        >
          {loading ? "Analyse…" : interpretation ? "↻" : "Analyser"}
        </button>
      </div>
      <div className="p-4">
        {!interpretation && !loading && !error && (
          <p className="text-[12px] text-[#B8AECF] font-light text-center py-2">
            Cliquez « Analyser » pour obtenir une interprétation du comportement.
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-[#8B7FA8] border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-grey font-light">
              Analyse en cours…
            </span>
          </div>
        )}
        {error && (
          <p className="text-[12px] text-danger font-light">{error}</p>
        )}
        {interpretation && !loading && (
          <p className="text-[13px] text-aubergine-light font-light leading-relaxed whitespace-pre-wrap">
            {interpretation}
          </p>
        )}
      </div>
    </div>
  );
}
