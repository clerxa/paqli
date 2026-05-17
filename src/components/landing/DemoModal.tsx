import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export function DemoModal({ onClose }: { onClose: () => void }) {
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid =
    company.trim().length > 0 &&
    employees.length > 0 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    role.trim().length > 0 &&
    emailValid &&
    phone.trim().length >= 6;

  async function handleSubmit() {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from("demo_requests").insert({
      email: email.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      company: company.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: role.trim(),
      phone: phone.trim(),
      employees_count: employees,
      source: "landing_page",
    });
    setLoading(false);
    if (insertError) {
      setError("Une erreur est survenue. Réessayez dans un instant.");
      return;
    }
    setSubmitted(true);
  }

  const inputCls =
    "w-full h-11 px-4 border border-[rgba(45,38,64,0.15)] rounded-xl text-[14px] text-[#2D2640] outline-none focus:border-[#8B7FA8] transition-colors bg-white";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(45,38,64,0.55)] backdrop-blur-sm px-4 py-6 animate-[fade-in_0.2s_ease-out] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl p-6 md:p-7 shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!submitted ? (
          <>
            <h3 className="font-display text-[24px] md:text-[26px] leading-tight text-[#2D2640]">
              Demander une démo
            </h3>
            <p className="mt-1.5 text-[13px] md:text-[14px] text-[#524970] font-light">
              20 minutes pour vous montrer comment Paqli transforme vos closings.
            </p>

            <div className="mt-5 space-y-3">
              {/* Entreprise */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                  Entreprise <span className="text-[#B85A6A]">*</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nom de votre entreprise"
                  maxLength={120}
                  autoFocus
                  className={inputCls}
                />
              </div>

              {/* Nombre de salariés */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                  Nombre de salariés <span className="text-[#B85A6A]">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {EMPLOYEE_RANGES.map((r) => {
                    const active = employees === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEmployees(r)}
                        className={`h-10 rounded-lg text-[12px] font-medium border transition-colors ${
                          active
                            ? "bg-[#2D2640] text-white border-[#2D2640]"
                            : "bg-white text-[#524970] border-[rgba(45,38,64,0.15)] hover:border-[#8B7FA8]"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                    Prénom <span className="text-[#B85A6A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={60}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                    Nom <span className="text-[#B85A6A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={60}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Fonction */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                  Fonction <span className="text-[#B85A6A]">*</span>
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Head of People, Talent Acquisition…"
                  maxLength={100}
                  className={inputCls}
                />
              </div>

              {/* Email / Téléphone */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                    Email pro <span className="text-[#B85A6A]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    maxLength={255}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium mb-1.5">
                    Téléphone <span className="text-[#B85A6A]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    maxLength={30}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-[12px] text-[#B85A6A]">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="mt-5 w-full py-3 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium disabled:opacity-40 hover:bg-[#3D3554] transition-colors"
            >
              {loading ? "Envoi…" : "Envoyer ma demande →"}
            </button>

            <p className="mt-3 text-[11px] text-center text-[#9B97A0]">
              Sans engagement · On ne revend pas vos données · Réponse sous 24h
            </p>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-5xl">✅</div>
            <h3 className="mt-4 font-display text-[24px] text-[#2D2640]">
              Demande envoyée !
            </h3>
            <p className="mt-2 text-[14px] text-[#524970] font-light">
              On vous contacte sous 24h pour caler votre démo.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2 text-[13px] text-[#8B7FA8] hover:text-[#2D2640] transition-colors"
            >
              Fermer
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#9B97A0] hover:text-[#2D2640] text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}
