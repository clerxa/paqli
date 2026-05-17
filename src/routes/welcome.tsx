import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/paqli/Logo";
import { useAuth } from "@/hooks/useAuth";
import { seedDemoData } from "@/lib/seedDemo";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const search = z.object({ name: z.string().optional() });

export const Route = createFileRoute("/welcome")({
  validateSearch: (s) => search.parse(s),
  component: WelcomePage,
});

async function ensureOrgAndProfile(fullName: string | null) {
  const orgName = fullName
    ? `${fullName.split(" ")[0]}'s workspace`
    : "Mon entreprise";
  const { data, error } = await supabase.rpc("bootstrap_user_workspace", {
    _org_name: orgName,
    _full_name: fullName ?? "",
  });
  if (error) throw error;
  return data as string;
}

function WelcomePage() {
  const navigate = useNavigate();
  const { name } = Route.useSearch();
  const { user, loading } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (loading || !user || ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ?? null;
        const orgId = await ensureOrgAndProfile(fullName);
        await seedDemoData().catch((e) =>
          console.error("seedDemoData failed", e),
        );
      } catch (e) {
        console.error("welcome setup failed", e);
      }
      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/dashboard" });
        }, 1200);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, user, loading]);

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
        Préparation de votre espace RH…
      </p>
      <CheckCircle2 size={56} style={{ color: "#C4A882" }} />
    </div>
  );
}
