import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useMobileNav } from "./MobileNav";

interface TopbarProps {
  title: ReactNode;
  actions?: ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { setOpen } = useMobileNav();
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 sm:px-7 py-3 sm:py-4"
      style={{
        borderBottom: "0.5px solid rgba(45,38,64,0.08)",
        background: "#FAF8F5",
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="md:hidden p-1.5 -ml-1 rounded-md text-aubergine hover:bg-[rgba(45,38,64,0.06)] shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <div
          className="font-display text-aubergine truncate text-[18px] sm:text-[22px]"
        >
          {title}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
