import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/paqli/Logo";
import { Button } from "@/components/paqli/Button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    navigate({ to: "/dashboard" });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#2D2640" }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          border: "1px solid rgba(139,127,168,0.1)",
        }}
      />
      <div className="mb-8 relative z-10">
        <Logo variant="light" size={36} />
      </div>
      <div
        className="w-full max-w-[400px] rounded-[16px] p-10 relative z-10"
        style={{ background: "#FAF8F5" }}
      >
        <h1 className="font-display text-aubergine mb-1" style={{ fontSize: 24 }}>
          Connexion
        </h1>
        <p className="text-[13px] font-light text-grey mb-6">
          Accédez à votre espace RH.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
              placeholder="vous@entreprise.fr"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 pr-10 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-grey hover:text-aubergine"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-[12px] rounded-lg px-3 py-2"
              style={{ background: "#FCEBEB", color: "#A32D2D" }}
            >
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 text-center text-[12px] text-aubergine-light">
          Pas encore de compte ?{" "}
          <Link to="/register" className="text-aubergine font-medium underline">
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
