import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PublicTestimonial } from "./TestimonialsBlock";

const SHOW_DURATION = 9000;
const GAP = 18000;
const INITIAL_DELAY = 6000;

export function TestimonialPopups({
  testimonials,
}: {
  testimonials: PublicTestimonial[] | undefined | null;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!testimonials || testimonials.length === 0 || dismissed) return;
    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    const cycle = (i: number) => {
      setIdx(i);
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        showTimer = window.setTimeout(
          () => cycle((i + 1) % testimonials.length),
          GAP,
        );
      }, SHOW_DURATION);
    };

    showTimer = window.setTimeout(() => cycle(0), INITIAL_DELAY);
    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [testimonials, dismissed]);

  if (!testimonials || testimonials.length === 0 || dismissed) return null;
  const t = testimonials[idx];
  if (!t) return null;

  return (
    <div
      className={`fixed z-40 left-3 sm:left-6 bottom-20 sm:bottom-6 max-w-[300px] sm:max-w-[340px] transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-3.5 flex items-start gap-3 relative"
        style={{ border: "0.5px solid rgba(45,38,64,0.1)" }}
      >
        <div className="flex-shrink-0 relative">
          {t.avatar_url ? (
            <img
              src={t.avatar_url}
              alt={t.first_name}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#F0EBE8]"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#F5F2FA] flex items-center justify-center font-serif text-[18px] text-[#8B7FA8] border-2 border-[#EDE9F5]">
              {t.first_name[0]}
            </div>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ background: "#4ade80" }}
            aria-hidden
          />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[12px] font-medium text-aubergine">
              {t.first_name}
            </span>
            <span className="text-[10px] text-grey truncate">
              · {t.job_title}
            </span>
          </div>
          <p className="text-[12px] text-aubergine-light leading-snug italic line-clamp-3">
            « {t.quote} »
          </p>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setDismissed(true)}
          className="absolute top-1.5 right-1.5 p-1 text-grey hover:text-aubergine transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
