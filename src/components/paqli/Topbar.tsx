import type { ReactNode } from "react";

interface TopbarProps {
  title: ReactNode;
  actions?: ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "16px 28px",
        borderBottom: "0.5px solid rgba(45,38,64,0.08)",
        background: "#FAF8F5",
      }}
    >
      <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
        {title}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
