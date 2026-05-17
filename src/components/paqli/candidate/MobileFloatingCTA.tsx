import { useEffect, useState } from "react";

type Status = "pending" | "thinking" | "accepted" | "declined" | string;

export function MobileFloatingCTA({
  offerStatus,
  revealed,
  onAccept,
  onThinking,
}: {
  offerStatus: Status;
  revealed: boolean;
  onAccept: () => void;
  onThinking: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => {
      const el = document.querySelector('[data-section="decision"]') as HTMLElement | null;
      if (!el) {
        setShow(true);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Show floating CTA when decision section is below the viewport
      setShow(rect.top > window.innerHeight - 80);
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [revealed, offerStatus]);

  if (!revealed || offerStatus !== "pending" || !show) return null;

  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe px-3 pt-3"
      style={{
        background: "rgba(250,248,245,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "0.5px solid rgba(45,38,64,0.08)",
      }}
    >
      <div className="flex gap-2">
        <button
          onClick={onThinking}
          className="flex-1 py-3 rounded-xl text-[13px] font-medium active:scale-[0.98] transition-transform"
          style={{
            background: "#F5F2FA",
            color: "#6B5F88",
            border: "1px solid rgba(139,127,168,0.3)",
          }}
        >
          💭 Réfléchir
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-3 rounded-xl text-[13px] font-medium text-white active:scale-[0.98] transition-transform"
          style={{
            background: "#2D2640",
            boxShadow: "0 4px 14px rgba(45,38,64,0.25)",
          }}
        >
          ✅ Accepter
        </button>
      </div>
    </div>
  );
}
