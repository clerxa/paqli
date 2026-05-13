import { ShieldAlert } from "lucide-react";

export function LegalNotice({
  text = "Les montants affichés sont des estimations à titre informatif. Paqli n'est pas un outil d'optimisation fiscale. Consultez un conseiller pour toute décision financière.",
  link,
}: {
  text?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div
      className="flex items-start gap-2 rounded-[10px]"
      style={{
        background: "#FAEEDA",
        border: "1px solid rgba(184,90,106,0.15)",
        padding: "14px 16px",
      }}
    >
      <ShieldAlert size={16} style={{ color: "#B85A6A" }} className="mt-[1px] shrink-0" />
      <div className="text-[12px] leading-relaxed" style={{ color: "#633806" }}>
        {text}
        {link && (
          <>
            {" "}
            <a href={link.href} className="underline font-medium">
              {link.label}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
