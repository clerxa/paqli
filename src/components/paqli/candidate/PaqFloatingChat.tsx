import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import paqAvatar from "@/assets/paq-avatar.png";

export function PaqFloatingChat({
  children,
  initialOpen = false,
  bubbleMessage = "Une question sur ce package ?",
}: {
  children: ReactNode;
  initialOpen?: boolean;
  bubbleMessage?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [showBubble, setShowBubble] = useState(false);

  // Reveal speech bubble after a short delay on first load
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setShowBubble(true), 2500);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <>
      {/* Floating launcher */}
      <div className="fixed z-40 right-3 sm:right-6 bottom-20 sm:bottom-6 flex items-end gap-2">
        {!open && showBubble && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-white rounded-2xl rounded-br-sm shadow-lg px-3.5 py-2.5 text-[12px] text-aubergine font-medium animate-paqli-slide-up max-w-[220px] text-left hover:shadow-xl transition-shadow"
            style={{ border: "0.5px solid rgba(45,38,64,0.1)" }}
          >
            <div className="text-[9px] uppercase tracking-wider text-[#8B7FA8] mb-0.5">
              Paq · Assistant IA
            </div>
            {bubbleMessage}
          </button>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir l'assistant Paq"
            className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
            style={{ background: "#F5F2FA", border: "2px solid #2D2640" }}
          >
            <img
              src={paqAvatar}
              alt="Paq"
              width={48}
              height={48}
              loading="lazy"
              className="w-12 h-12 object-contain"
            />
            <span
              className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ background: "#4ade80" }}
              aria-hidden
            />
          </button>
        )}
      </div>

      {/* Open panel */}
      {open && (
        <div
          className="fixed z-50 right-2 sm:right-6 bottom-2 sm:bottom-6 left-2 sm:left-auto sm:w-[400px] max-h-[min(640px,90vh)] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-paqli-slide-up"
          style={{
            background: "#FAF8F5",
            border: "0.5px solid rgba(45,38,64,0.12)",
          }}
        >
          <header
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "#2D2640" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#F5F2FA" }}
            >
              <img
                src={paqAvatar}
                alt="Paq"
                width={36}
                height={36}
                loading="lazy"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-white leading-tight">
                Paq
              </div>
              <div className="text-[10px] flex items-center gap-1.5" style={{ color: "#B8AECF" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#4ade80" }}
                />
                Assistant IA · disponible 24/7
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Réduire"
              className="text-white/80 hover:text-white p-1 transition-colors"
            >
              <X size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </>
  );
}
