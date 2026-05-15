import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/paqli/Logo";
import { Button } from "@/components/paqli/Button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

interface OrgData {
  companyName: string;
  siren: string;
  size: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
      />
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState<OrgData>({ companyName: "", siren: "", size: "11-50" });
  const [usr, setUsr] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const goNext = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!org.companyName.trim()) {
      setError("Le nom de l'entreprise est obligatoire.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(usr.email)) {
      setError("Email invalide.");
      return;
    }
    if (usr.password.length < 8 || !/\d/.test(usr.password)) {
      setError("Le mot de passe doit faire au moins 8 caractères et contenir un chiffre.");
      return;
    }
    if (usr.password !== usr.passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: usr.email,
      password: usr.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: `${usr.firstName} ${usr.lastName}`.trim() },
      },
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Erreur lors de la création du compte.");
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setError(
        "Vérifiez votre email pour confirmer votre compte avant de finaliser l'inscription.",
      );
      setLoading(false);
      return;
    }

    const slug = `${slugify(org.companyName)}-${Date.now().toString(36)}`;
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: org.companyName, slug, plan: "starter" })
      .select()
      .single();

    if (orgError || !orgData) {
      setError("Erreur lors de la création de l'entreprise.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: orgData.id,
      full_name: `${usr.firstName} ${usr.lastName}`.trim(),
      email: usr.email,
    });

    if (profileError) {
      setError("Erreur lors de la création du profil.");
      setLoading(false);
      return;
    }

    await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      organization_id: orgData.id,
      role: "admin",
    });

    navigate({ to: "/welcome", search: { name: usr.firstName } });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#2D2640" }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 400, height: 400, border: "1px solid rgba(139,127,168,0.1)" }}
      />
      <div className="mb-8 relative z-10">
        <Logo variant="light" size={36} />
      </div>
      <div
        className="w-full max-w-[440px] rounded-[16px] p-10 relative z-10"
        style={{ background: "#FAF8F5" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="text-[11px] text-grey uppercase tracking-wider whitespace-nowrap">
            Étape {step} / 2
          </div>
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "#E0D9D3" }}>
            <div
              className="h-full transition-all"
              style={{ width: step === 1 ? "50%" : "100%", background: "#C4A882" }}
            />
          </div>
        </div>

        <h1 className="font-display text-aubergine mb-1" style={{ fontSize: 24 }}>
          Créer votre compte
        </h1>
        <p className="text-[12px] text-grey mb-6">
          {step === 1
            ? "Étape 1 sur 2 — Votre entreprise"
            : "Étape 2 sur 2 — Vos informations"}
        </p>

        {step === 1 ? (
          <form className="space-y-4" onSubmit={goNext}>
            <Field
              label="Nom de l'entreprise"
              placeholder="TechCorp SAS"
              value={org.companyName}
              onChange={(v) => setOrg({ ...org, companyName: v })}
              required
            />
            <Field
              label="SIREN (optionnel)"
              placeholder="123 456 789"
              value={org.siren}
              onChange={(v) => setOrg({ ...org, siren: v })}
            />
            <div>
              <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
                Taille de l'équipe
              </label>
              <select
                value={org.size}
                onChange={(e) => setOrg({ ...org, size: e.target.value })}
                className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
              >
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>200+</option>
              </select>
            </div>

            {error && (
              <div
                className="text-[12px] rounded-lg px-3 py-2"
                style={{ background: "#FCEBEB", color: "#A32D2D" }}
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full">
              Continuer →
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Prénom"
                value={usr.firstName}
                onChange={(v) => setUsr({ ...usr, firstName: v })}
                required
              />
              <Field
                label="Nom"
                value={usr.lastName}
                onChange={(v) => setUsr({ ...usr, lastName: v })}
                required
              />
            </div>
            <Field
              label="Email professionnel"
              type="email"
              placeholder="vous@entreprise.fr"
              value={usr.email}
              onChange={(v) => setUsr({ ...usr, email: v })}
              required
            />
            <Field
              label="Mot de passe (8 car. min, 1 chiffre)"
              type="password"
              value={usr.password}
              onChange={(v) => setUsr({ ...usr, password: v })}
              required
            />
            <Field
              label="Confirmer le mot de passe"
              type="password"
              value={usr.passwordConfirm}
              onChange={(v) => setUsr({ ...usr, passwordConfirm: v })}
              required
            />

            {error && (
              <div
                className="text-[12px] rounded-lg px-3 py-2"
                style={{ background: "#FCEBEB", color: "#A32D2D" }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="flex-1"
                disabled={loading}
              >
                Retour
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Création…" : "Créer mon compte"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-[12px] text-aubergine-light">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-aubergine font-medium underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
