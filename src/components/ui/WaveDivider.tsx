import { useEffect, useState } from "react";

export type WaveVariant = "A" | "B" | "C";

const PATHS: Record<WaveVariant, string> = {
  // Variante A — vague douce, 2 crêtes
  A: "M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1350,20 1440,40 L1440,80 L0,80 Z",
  // Variante B — vague ample, 1 grande courbe
  B: "M0,60 C360,0 1080,80 1440,20 L1440,80 L0,80 Z",
  // Variante C — vague asymétrique
  C: "M0,20 C240,80 480,0 720,50 C960,100 1200,10 1440,40 L1440,80 L0,80 Z",
};

interface WaveDividerProps {
  fromColor: string;
  toColor: string;
  flip?: boolean;
  height?: number;
  variant?: WaveVariant;
}

export function WaveDivider({
  fromColor,
  toColor,
  flip = false,
  height,
  variant = "A",
}: WaveDividerProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const h = height ?? (isMobile ? 50 : 80);

  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: fromColor,
        marginBottom: -1,
        lineHeight: 0,
      }}
    >
      <svg
        viewBox="0 0 1440 80"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: `${h}px`,
          transform: flip ? "scaleX(-1)" : "none",
        }}
      >
        <path d={PATHS[variant]} fill={toColor} />
      </svg>
    </div>
  );
}
