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

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureOrgAndProfile(userId: string, email: string, fullName: string | null) {
  // Profile already exists?
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.organization_id) return existing.organization_id;

  const orgName = fullName ? `${fullName.split(" ")[0]}'s workspace` : "Mon entreprise";
  const slug = `${slugify(orgName)}-${Date.now().toString(36)}`;
  const { data: orgData, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: orgName, slug, plan: "starter" })
    .select()
    .single();
  if (orgErr || !orgData) throw orgErr ?? new Error("org create failed");

  const { error: profErr } = await supabase.from("profiles").insert({
    id: userId,
    organization_id: orgData.id,
    role: "admin",
    full_name: fullName,
    email,
  });
  if (profErr) throw profErr;

  await supabase.from("user_roles").insert({
    user_id: userId,
    organization_id: orgData.id,
    role: "admin",
  });

  return orgData.id;
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
        const orgId = await ensureOrgAndProfile(user.id, user.email ?? "", fullName);
        await seedDemoData(orgId, user.id).catch((e) =>
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
