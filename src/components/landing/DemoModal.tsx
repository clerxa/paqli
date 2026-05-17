import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function DemoModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.includes("@") || loading) return;
    setLoading(true);
    await supabase.from("demo_requests").insert({
      email,
      name: name || null,
      company: company || null,
      source: "landing_page",
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(45,38,64,0.55)] backdrop-blur-sm px-4 animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!submitted ? (
          <>
            <h3 className="font-display text-[26px] leading-tight text-[#2D2640]">
              Demander une démo
            </h3>
            <p className="mt-2 text-[14px] text-[#524970] font-light">
              On vous répond sous 24h pour caler un créneau de 20 minutes.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoFocus
              className="mt-5 w-full h-11 px-4 border border-[rgba(45,38,64,0.15)] rounded-xl text-[14px] text-[#2D2640] outline-none focus:border-[#8B7FA8] transition-colors"
            />

            {email.includes("@") && (
              <div className="mt-3 space-y-2 animate-[fade-in_0.25s_ease-out]">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre prénom (optionnel)"
                  className="w-full h-11 px-4 border border-[rgba(45,38,64,0.12)] rounded-xl text-[13px] text-[#2D2640] outline-none focus:border-[#8B7FA8] transition-colors"
                />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Votre entreprise (optionnel)"
                  className="w-full h-11 px-4 border border-[rgba(45,38,64,0.12)] rounded-xl text-[13px] text-[#2D2640] outline-none focus:border-[#8B7FA8] transition-colors"
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!email.includes("@") || loading}
              className="mt-5 w-full py-3 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium disabled:opacity-40 hover:bg-[#3D3554] transition-colors"
            >
              {loading ? "Envoi…" : "Envoyer ma demande →"}
            </button>

            <p className="mt-3 text-[11px] text-center text-[#9B97A0]">
              Sans engagement · On ne revend pas vos données
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
