import { useCallback, useEffect, useRef } from "react";
import type { PackageData } from "@/lib/clientCalc";
import {
  estimateBenefitValue,
  getBenefitDef,
} from "@/lib/benefitCatalog";

export type ProactiveTrigger =
  | "equity_time"
  | "benefits_time"
  | "deadline_soon"
  | "simulation_many"
  | "decision_view";

export interface ProactiveSuggestion {
  trigger: ProactiveTrigger;
  message: string;
  question: string;
  icon: string;
}

interface UseProactiveAssistantOptions {
  pkg: PackageData;
  orgName: string;
  firstName: string | null;
  decisionDeadline: string | null;
  offerStatus: string;
  hasMessages: boolean;
  onSuggest: (suggestion: ProactiveSuggestion) => void;
}

const MAX_SUGGESTIONS = 2;
const MIN_INTERVAL_MS = 3 * 60 * 1000;

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "0 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function useProactiveAssistant({
  pkg,
  firstName: _firstName,
  decisionDeadline,
  offerStatus,
  hasMessages,
  onSuggest,
}: UseProactiveAssistantOptions) {
  const firedTriggers = useRef<Set<ProactiveTrigger>>(new Set());
  const suggestionCount = useRef(0);
  const lastSuggestionAt = useRef<number>(0);
  const hasMessagesRef = useRef(hasMessages);
  useEffect(() => {
    hasMessagesRef.current = hasMessages;
  }, [hasMessages]);

  const shouldFire = useCallback(
    (trigger: ProactiveTrigger): boolean => {
      if (offerStatus !== "pending") return false;
      if (firedTriggers.current.has(trigger)) return false;
      if (suggestionCount.current >= MAX_SUGGESTIONS) return false;
      if (Date.now() - lastSuggestionAt.current < MIN_INTERVAL_MS) return false;
      if (hasMessagesRef.current) return false;
      return true;
    },
    [offerStatus],
  );

  const fire = useCallback(
    (trigger: ProactiveTrigger, suggestion: ProactiveSuggestion) => {
      if (!shouldFire(trigger)) return;
      firedTriggers.current.add(trigger);
      suggestionCount.current += 1;
      lastSuggestionAt.current = Date.now();
      onSuggest(suggestion);
    },
    [shouldFire, onSuggest],
  );

  const onEquitySectionTime = useCallback(
    (seconds: number) => {
      if (seconds < 90) return;
      const devices = pkg.equity_devices ?? [];
      if (devices.length === 0) return;
      const deviceType = (devices[0].type ?? "").toUpperCase() || "equity";
      fire("equity_time", {
        trigger: "equity_time",
        icon: "📈",
        message: `Vous explorez les scénarios ${deviceType} — c'est souvent là que les questions émergent.`,
        question: `Comment fonctionnent les ${deviceType} si l'entreprise est rachetée avant que je parte ?`,
      });
    },
    [pkg, fire],
  );

  const onBenefitsSectionTime = useCallback(
    (seconds: number) => {
      if (seconds < 60) return;
      const benefits = pkg.package_benefits ?? [];
      const topBenefit = benefits
        .filter((b) => estimateBenefitValue(b) > 0)
        .sort((a, b) => estimateBenefitValue(b) - estimateBenefitValue(a))[0];
      if (!topBenefit) return;
      const def = getBenefitDef(topBenefit.benefit_key);
      const val = estimateBenefitValue(topBenefit);
      const label = def?.label ?? "Cet avantage";
      fire("benefits_time", {
        trigger: "benefits_time",
        icon: "💡",
        message: `${label} représente ~${formatAmount(val)}/an que vous n'avancez pas. Vous souhaitez plus de détails ?`,
        question: `Comment fonctionne concrètement ${label} au quotidien ?`,
      });
    },
    [pkg, fire],
  );

  // Trigger 3 — Deadline proche
  useEffect(() => {
    if (!decisionDeadline || offerStatus !== "pending") return;
    const hoursLeft =
      (new Date(decisionDeadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft > 48 || hoursLeft <= 0) return;

    const timer = setTimeout(() => {
      fire("deadline_soon", {
        trigger: "deadline_soon",
        icon: "⏱",
        message: `Il vous reste ${Math.round(hoursLeft)}h pour répondre. Y a-t-il des points qui bloquent votre décision ?`,
        question:
          "Quels sont les points sur lesquels j'ai besoin de clarification avant de décider ?",
      });
    }, 30_000);

    return () => clearTimeout(timer);
  }, [decisionDeadline, offerStatus, fire]);

  const onSimulationChanges = useCallback(
    (count: number) => {
      if (count < 4) return;
      fire("simulation_many", {
        trigger: "simulation_many",
        icon: "🧮",
        message:
          "Vous testez plusieurs scénarios — c'est une bonne démarche. Voulez-vous que je vous explique comment optimiser votre situation ?",
        question:
          "Quelle TMI et quelle ancienneté correspondent à ma situation réelle ?",
      });
    },
    [fire],
  );

  const decisionTimerRef = useRef<number | null>(null);
  const onDecisionSectionView = useCallback(() => {
    if (decisionTimerRef.current) return;
    decisionTimerRef.current = window.setTimeout(() => {
      decisionTimerRef.current = null;
      fire("decision_view", {
        trigger: "decision_view",
        icon: "🤔",
        message:
          "Vous consultez la section décision. Y a-t-il des points du package sur lesquels vous souhaitez plus de clarté avant de vous engager ?",
        question:
          "Quels sont les points que je dois clarifier avant d'accepter ou de refuser ?",
      });
    }, 15_000);
  }, [fire]);

  useEffect(() => {
    return () => {
      if (decisionTimerRef.current) {
        clearTimeout(decisionTimerRef.current);
      }
    };
  }, []);

  return {
    onEquitySectionTime,
    onBenefitsSectionTime,
    onSimulationChanges,
    onDecisionSectionView,
  };
}
