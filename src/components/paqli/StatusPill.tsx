import { cn } from "@/lib/utils";

export type PillStatus = "active" | "draft" | "archived" | "opened";

const styles: Record<PillStatus, { bg: string; color: string; label: string }> = {
  active: { bg: "#EAF3DE", color: "#27500A", label: "Actif" },
  draft: { bg: "#F0EBE8", color: "#6B5F88", label: "Brouillon" },
  archived: { bg: "#F1EFE8", color: "#5F5E5A", label: "Archivé" },
  opened: { bg: "#E6F1FB", color: "#0C447C", label: "Ouvert" },
};

export function StatusPill({
  status,
  children,
  className,
}: {
  status: PillStatus;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium px-[9px] py-[3px] rounded-[20px]",
        className,
      )}
      style={{ background: s.bg, color: s.color }}
    >
      {children ?? s.label}
    </span>
  );
}
