import type { ReactNode } from "react";
import { Info, AlertTriangle } from "lucide-react";

export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[10px]"
      style={{ background: "#EAF3DE", color: "#27500A", padding: "12px 14px" }}
    >
      <Info size={14} className="mt-[1px] shrink-0" />
      <div className="text-[12px] leading-relaxed">{children}</div>
    </div>
  );
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[10px]"
      style={{ background: "#FAEEDA", color: "#633806", padding: "12px 14px" }}
    >
      <AlertTriangle size={14} className="mt-[1px] shrink-0" />
      <div className="text-[12px] leading-relaxed">{children}</div>
    </div>
  );
}
