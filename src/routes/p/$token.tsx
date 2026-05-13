import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/paqli/Logo";
import { LegalNotice } from "@/components/paqli/LegalNotice";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/p/$token")({
  component: PublicPackagePage,
});

function PublicPackagePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAF8F5" }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "0.5px solid rgba(45,38,64,0.08)" }}
      >
        <Logo />
        <div className="flex items-center gap-2 text-[12px] text-aubergine-light">
          <Lock size={12} />
          Lien sécurisé
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-[680px] space-y-6">
          <div
            className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-8 text-center"
          >
            <div className="text-[11px] text-grey uppercase tracking-wider mb-2">
              Package en cours de chargement
            </div>
            <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
              Bientôt disponible
            </div>
          </div>
          <LegalNotice />
        </div>
      </main>
    </div>
  );
}
