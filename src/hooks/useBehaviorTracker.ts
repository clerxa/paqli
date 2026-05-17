import { useCallback, useEffect, useRef } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const TRACK_URL = `/api/public/track-behavior`;

type EventType =
  | "section_view"
  | "section_time"
  | "simulation_change"
  | "scenario_view"
  | "external_link"
  | "page_exit"
  | "page_return"
  | "opened"
  | "simulated"
  | "reveal_clicked";

interface TrackPayload {
  token: string;
  eventType: EventType;
  section?: string;
  value?: string | number | boolean;
  durationS?: number;
}

function sendBeacon(payload: TrackPayload) {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon(TRACK_URL, blob);
  } catch {
    // silent
  }
}

async function trackFetch(payload: TrackPayload) {
  try {
    await fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // silent — never block UX
  }
}

export interface BehaviorTrackerCallbacks {
  onSectionView?: (sectionId: string) => void;
  onSectionTime?: (sectionId: string, durationS: number) => void;
}

export function useBehaviorTracker(
  token: string,
  callbacks?: BehaviorTrackerCallbacks,
) {
  const pageStartTime = useRef(Date.now());
  const sectionStartTimes = useRef<Record<string, number>>({});
  const tracked = useRef<Set<string>>(new Set());
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const track = useCallback(
    (eventType: EventType, extra: Omit<TrackPayload, "token" | "eventType"> = {}) => {
      void trackFetch({ token, eventType, ...extra });
    },
    [token],
  );

  // page_exit + page_return via visibility/beforeunload
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      const durationS = Math.round((Date.now() - pageStartTime.current) / 1000);
      sendBeacon({ token, eventType: "page_exit", durationS });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        track("page_return");
        pageStartTime.current = Date.now();
      } else {
        const durationS = Math.round((Date.now() - pageStartTime.current) / 1000);
        sendBeacon({ token, eventType: "page_exit", durationS });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, track]);

  const trackSectionView = useCallback(
    (sectionId: string) => {
      if (tracked.current.has(`section_${sectionId}`)) {
        sectionStartTimes.current[sectionId] = Date.now();
        callbacksRef.current?.onSectionView?.(sectionId);
        return;
      }
      tracked.current.add(`section_${sectionId}`);
      sectionStartTimes.current[sectionId] = Date.now();
      track("section_view", { section: sectionId });
      callbacksRef.current?.onSectionView?.(sectionId);
    },
    [track],
  );

  const trackSectionTime = useCallback(
    (sectionId: string) => {
      const start = sectionStartTimes.current[sectionId];
      if (!start) return;
      const durationS = Math.round((Date.now() - start) / 1000);
      delete sectionStartTimes.current[sectionId];
      if (durationS < 2) return;
      track("section_time", { section: sectionId, durationS });
      callbacksRef.current?.onSectionTime?.(sectionId, durationS);
    },
    [track],
  );

  const trackSimulationChange = useCallback(
    (param: string, value: string | number | boolean) => {
      track("simulation_change", { section: "simulation", value: `${param}:${value}` });
    },
    [track],
  );

  const trackScenarioView = useCallback(
    (scenarioLabel: string) => {
      track("scenario_view", { section: "equity", value: scenarioLabel });
    },
    [track],
  );

  const trackExternalLink = useCallback(
    (url: string) => {
      const domain = url.includes("glassdoor")
        ? "glassdoor"
        : url.includes("welcometothejungle")
          ? "wtj"
          : url.includes("linkedin")
            ? "linkedin"
            : "other";
      track("external_link", { value: domain });
    },
    [track],
  );

  // Auto-observer for [data-section] elements
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute("data-section");
          if (!sectionId) return;
          if (entry.isIntersecting) {
            trackSectionView(sectionId);
          } else {
            trackSectionTime(sectionId);
          }
        });
      },
      { threshold: 0.3 },
    );

    // Observe initially + watch for late-mounted sections
    const attach = () => {
      document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
    };
    attach();
    const mutationObs = new MutationObserver(() => attach());
    mutationObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObs.disconnect();
    };
  }, [trackSectionView, trackSectionTime]);

  // Suppress unused warning for SUPABASE_URL (kept for future absolute-url use)
  void SUPABASE_URL;

  return {
    track,
    trackSectionView,
    trackSectionTime,
    trackSimulationChange,
    trackScenarioView,
    trackExternalLink,
  };
}
