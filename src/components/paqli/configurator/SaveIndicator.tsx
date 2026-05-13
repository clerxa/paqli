import { Loader2, Check } from "lucide-react";
import type { SaveState } from "@/contexts/PackageConfigContext";

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-grey">
        <Loader2 size={12} className="animate-spin" /> Sauvegarde…
      </span>
    );
  if (state === "saved")
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
        style={{ background: "#EAF3DE", color: "#27500A" }}
      >
        <Check size={12} /> Sauvegardé
      </span>
    );
  if (state === "dirty")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-grey">
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: "#C4A882" }}
        />
        Modifications non sauvegardées
      </span>
    );
  return null;
}
