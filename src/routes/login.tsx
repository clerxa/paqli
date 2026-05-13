import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/paqli/Logo";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#2D2640" }}
    >
      <div className="mb-8">
        <Logo variant="light" size={36} />
      </div>
      <div
        className="w-full max-w-[400px] rounded-[12px] p-8"
        style={{ background: "#FAF8F5" }}
      >
        <h1 className="font-display text-aubergine mb-1" style={{ fontSize: 24 }}>
          Connexion
        </h1>
        <p className="text-[12px] text-grey mb-6">
          Accédez à votre espace RH Paqli.
        </p>
        <form className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
              Email
            </label>
            <input
              type="email"
              className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
              placeholder="vous@entreprise.fr"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
              Mot de passe
            </label>
            <input
              type="password"
              className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
              placeholder="••••••••"
            />
          </div>
          <Button className="w-full">Se connecter</Button>
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
