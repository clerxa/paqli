import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/paqli/Logo";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
      />
    </div>
  );
}

function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#2D2640" }}
    >
      <div className="mb-8">
        <Logo variant="light" size={36} />
      </div>
      <div
        className="w-full max-w-[440px] rounded-[12px] p-8"
        style={{ background: "#FAF8F5" }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="text-[11px] text-grey uppercase tracking-wider">
            Étape {step} / 2
          </div>
          <div className="flex-1 h-[3px] bg-brume rounded-full overflow-hidden">
            <div
              className="h-full bg-aubergine transition-all"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        <h1 className="font-display text-aubergine mb-1" style={{ fontSize: 24 }}>
          {step === 1 ? "Votre entreprise" : "Votre compte"}
        </h1>
        <p className="text-[12px] text-grey mb-6">
          {step === 1
            ? "Quelques informations pour configurer Paqli."
            : "Créez votre accès personnel."}
        </p>

        {step === 1 ? (
          <div className="space-y-4">
            <Field label="Nom de l'entreprise" placeholder="Acme Tech" />
            <Field label="SIREN" placeholder="123 456 789" />
            <Field label="Taille" placeholder="11–50" />
            <Button className="w-full" onClick={() => setStep(2)}>Continuer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" />
              <Field label="Nom" />
            </div>
            <Field label="Email pro" type="email" placeholder="vous@entreprise.fr" />
            <Field label="Mot de passe" type="password" />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button className="flex-1">Créer mon compte</Button>
            </div>
          </div>
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
