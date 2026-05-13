import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/paqli/Logo";
import { z } from "zod";

const search = z.object({ name: z.string().optional() });

export const Route = createFileRoute("/welcome")({
  validateSearch: (s) => search.parse(s),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { name } = Route.useSearch();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: "#2D2640" }}
    >
      <div className="mb-8">
        <Logo variant="light" size={40} />
      </div>
      <h1
        className="font-display mb-3"
        style={{ fontSize: 28, color: "#FAF8F5" }}
      >
        Bienvenue chez Paqli{name ? `, ${name}` : ""} !
      </h1>
      <p className="text-[14px] font-light mb-8" style={{ color: "#B8AECF" }}>
        Votre espace RH est prêt.
      </p>
      <CheckCircle2 size={56} style={{ color: "#C4A882" }} />
    </div>
  );
}
