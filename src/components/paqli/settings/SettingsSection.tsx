import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  icon?: string;
  description?: string;
  score?: number | null;
  required?: boolean;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SettingsSection({
  title,
  icon,
  description,
  score = null,
  required,
  badge,
  defaultOpen,
  children,
}: Props) {
  const initialOpen = defaultOpen ?? (score !== null && score < 100);
  const [expanded, setExpanded] = useState(initialOpen);

  const statusBadge =
    score === null
      ? null
      : score === 100
        ? { label: "Complet", color: "bg-[#EAF3DE] text-[#27500A]" }
        : score >= 50
          ? { label: "Partiel", color: "bg-[#FAEEDA] text-[#633806]" }
          : { label: "Incomplet", color: "bg-[#FCEBEB] text-[#A32D2D]" };

  return (
    <div className="bg-white border border-[rgba(45,38,64,0.08)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAF9] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-[20px]">{icon}</span>}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-medium text-aubergine">{title}</span>
              {required && (
                <span className="text-[9px] bg-[#F0EBE8] text-grey px-1.5 py-0.5 rounded-full">
                  Requis
                </span>
              )}
              {badge && (
                <span className="text-[9px] bg-[#F5F2FA] text-[#8B7FA8] px-1.5 py-0.5 rounded-full font-medium">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <div className="text-[11px] text-grey font-light mt-0.5">{description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {statusBadge && (
            <span
              className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`text-grey transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-[rgba(45,38,64,0.06)] pt-4">{children}</div>
      )}
    </div>
  );
}
