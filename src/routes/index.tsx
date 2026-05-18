import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DemoModal } from "@/components/landing/DemoModal";

/* Animated number counter (eased) */
function useCountUp(target: number, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/* In-view (one-shot) */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); o.disconnect(); } },
      { threshold }
    );
    o.observe(el);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* Pointer-based 3D tilt */
function useTilt<T extends HTMLElement>(intensity = 5) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateY(-4px)`;
    };
    const onLeave = () => { el.style.transform = ""; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [intensity]);
  return ref;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paqli — Le package qui se comprend du premier coup." },
      {
        name: "description",
        content:
          "Simulateur fiscal, Total Compensation interactive, suivi IA candidat. Transformez chaque offre en conversation transparente — +25% de taux de closing.",
      },
      { property: "og:title", content: "Paqli — Le package qui se comprend du premier coup." },
      {
        property: "og:description",
        content:
          "Simulateur fiscal, Total Compensation interactive, suivi IA candidat. Utilisé par les équipes RH tech.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://paqli.fr" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Paqli — Le package qui se comprend du premier coup." },
      {
        name: "twitter:description",
        content:
          "Transformez chaque offre en conversation transparente. Simulateur fiscal, Total Compensation, suivi IA — +25% de taux de closing.",
      },
    ],
    links: [{ rel: "canonical", href: "https://paqli.fr" }],
  }),
  component: LandingPage,
});

/* -------------------------------------------------- */
/* Navbar                                             */
/* -------------------------------------------------- */
function Navbar({ onDemo }: { onDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-[rgba(45,38,64,0.08)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="font-display text-[26px] text-[#2D2640] leading-none">
          paqli
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#524970]">
          <a href="#produit" className="hover:text-[#2D2640] transition-colors">Produit</a>
          <a href="#pricing" className="hover:text-[#2D2640] transition-colors">Tarifs</a>
          <a href="#temoignages" className="hover:text-[#2D2640] transition-colors">Ressources</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[14px] text-[#524970] hover:text-[#2D2640] transition-colors">
            Se connecter
          </Link>
          <button
            onClick={onDemo}
            className="cta-primary px-5 py-2.5 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium hover:bg-[#3D3554] transition-colors"
          >
            Demander une démo →
          </button>
        </div>

        <button
          className="md:hidden w-10 h-10 flex items-center justify-center text-[#2D2640]"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[rgba(45,38,64,0.55)] z-50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-white p-6 animate-[slide-in-right_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button onClick={() => setMenuOpen(false)} className="text-2xl text-[#9B97A0]">×</button>
            </div>
            <nav className="mt-6 flex flex-col gap-5 text-[16px] text-[#2D2640]">
              <a href="#produit" onClick={() => setMenuOpen(false)}>Produit</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>Tarifs</a>
              <a href="#temoignages" onClick={() => setMenuOpen(false)}>Ressources</a>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Se connecter</Link>
              <button
                onClick={() => { setMenuOpen(false); onDemo(); }}
                className="mt-2 px-5 py-3 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium"
              >
                Demander une démo →
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------- */
/* Hero mockup (right side)                           */
/* -------------------------------------------------- */
function HeroMockup() {
  const tiltRef = useTilt<HTMLDivElement>(4);

  return (
    <div className="relative w-full max-w-md mx-auto animate-float">
      <div
        ref={tiltRef}
        className="tilt rounded-2xl bg-white border border-[rgba(45,38,64,0.08)] overflow-hidden shadow-[0_30px_60px_-30px_rgba(45,38,64,0.35)] will-change-transform"
      >
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F0EBE8] border-b border-[rgba(45,38,64,0.06)]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8A6A6]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8CFA6]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#B6D3A8]" />
          </div>
          <div className="flex-1 text-center text-[11px] text-[#9B97A0]">paqli.fr/p/thomas-b</div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D2640] text-white flex items-center justify-center font-display text-[18px]">N</div>
            <div>
              <div className="font-display text-[16px] text-[#2D2640] leading-none">Nexora</div>
              <div className="text-[11px] text-[#9B97A0] mt-0.5">Senior Engineer Backend</div>
            </div>
          </div>

          <div className="mt-5 text-[11px] uppercase tracking-wider text-[#9B97A0]">Votre package vaut</div>
          <div className="font-display text-[44px] leading-none mt-1 text-aurora tabular-nums">
            ~102 000 €
          </div>
          <div className="text-[11px] text-[#9B97A0] mt-1">par an · hors equity</div>

          <div className="mt-4 space-y-2">
            <Row label="Fixe net estimé" value="~43 300 €" />
            <Row label="Épargne salariale" value="~7 868 €" />
            <Row label="🏋️ GymLib + 📚 Formation" value="~2 480 €" />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#FAF8F5]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#524970]">Score engagement</span>
              <span className="text-[12px] font-medium text-[#2D2640] tabular-nums">82/100 🔥</span>
            </div>
            <div className="mt-2 h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8B7FA8] to-[#C4A882] rounded-full"
                style={{ width: "82%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badge EN DIRECT with ping ring */}
      <div className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[rgba(45,38,64,0.08)] shadow-md">
        <span className="relative w-1.5 h-1.5 rounded-full bg-[#3B6D11] text-[#3B6D11] ping-soft" />
        <span className="text-[10px] font-medium tracking-wider text-[#2D2640]">EN DIRECT</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[rgba(45,38,64,0.05)] last:border-0">
      <span className="text-[12px] text-[#524970]">{label}</span>
      <span className="text-[12px] font-medium text-[#2D2640]">{value}</span>
    </div>
  );
}

/* -------------------------------------------------- */
/* Hero                                               */
/* -------------------------------------------------- */
function Hero({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative pt-32 md:pt-36 pb-16 md:pb-24 px-5 bg-[#FAF8F5] overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb orb-1 -top-20 -left-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.45), transparent 70%)" }} />
      <div className="orb orb-2 top-40 -right-32 w-[480px] h-[480px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.35), transparent 70%)" }} />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-[55%_45%] gap-12 items-center">
        <div className="scroll-reveal revealed">
          <span className="inline-block px-3 py-1.5 rounded-full text-[12px] font-medium text-[#8B7FA8] bg-[rgba(139,127,168,0.12)] border border-[rgba(139,127,168,0.2)] backdrop-blur-sm animate-paqli-slide-up" style={{ animationDelay: "0ms" }}>
            ✨ Closing · Fiscalité 2026 · IA embarquée
          </span>
          <h1 className="mt-5 font-display text-[#2D2640] leading-[1.05] animate-paqli-slide-up" style={{ fontSize: "clamp(36px, 5vw, 62px)", animationDelay: "100ms" }}>
            Le package qui se comprend <span className="text-aurora">du premier coup.</span>
          </h1>
          <p className="mt-5 font-light text-[#524970] leading-relaxed animate-paqli-slide-up" style={{ fontSize: "clamp(16px, 1.5vw, 19px)", animationDelay: "200ms" }}>
            Transformez chaque offre en conversation transparente.
            Simulateur fiscal, Total Compensation, suivi IA — +25% de taux de closing en moyenne.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 animate-paqli-slide-up" style={{ animationDelay: "300ms" }}>
            <button
              onClick={onDemo}
              className="cta-primary px-6 py-3.5 bg-[#2D2640] text-white rounded-xl text-[15px] font-medium hover:bg-[#3D3554] transition-colors"
            >
              Demander une démo →
            </button>
            <a
              href="#produit"
              className="px-6 py-3.5 bg-transparent text-[#8B7FA8] border border-[rgba(139,127,168,0.35)] rounded-xl text-[15px] font-medium hover:bg-[rgba(139,127,168,0.08)] transition-colors"
            >
              Voir le produit ↓
            </a>
          </div>

          <div className="mt-5 flex items-center gap-2 text-[12px] text-[#9B97A0] animate-paqli-slide-up" style={{ animationDelay: "400ms" }}>
            <span className="text-[#C4A882]">★★★★★</span>
            <span>Utilisé par 50+ équipes RH tech</span>
          </div>
        </div>

        <div className="animate-paqli-slide-up" style={{ animationDelay: "350ms" }}>
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Logo bar                                           */
/* -------------------------------------------------- */
function LogoBar() {
  const metrics = [
    { value: "2026", label: "Règles fiscales à jour" },
    { value: "5", label: "Régimes BSPCE couverts" },
    { value: "30+", label: "Avantages catalogués" },
    { value: "RGPD", label: "Hébergement EU" },
  ];
  return (
    <section className="py-8 bg-[#F0EBE8]">
      <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-5">
        {metrics.map((m) => (
          <div key={m.label} className="text-center md:text-left">
            <div className="font-display text-[26px] md:text-[30px] text-[#2D2640] leading-none">
              {m.value}
            </div>
            <div className="mt-1.5 text-[11px] md:text-[12px] text-[#524970] font-light">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Tag pill                                           */
/* -------------------------------------------------- */
function Tag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider ${
        dark
          ? "bg-[rgba(255,255,255,0.1)] text-[#B8AECF]"
          : "bg-[rgba(139,127,168,0.12)] text-[#8B7FA8]"
      }`}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------- */
/* Problem                                            */
/* -------------------------------------------------- */
function ProblemSection() {
  const items = [
    { icon: "📭", title: "Le RH est aveugle", desc: "Zéro visibilité entre l'envoi et la réponse. Il relance à l'aveugle." },
    { icon: "🧮", title: "Le candidat est perdu", desc: "Brut ≠ net. BSPCE, PEE, intéressement — personne ne calcule." },
    { icon: "💰", title: "La valeur est invisible", desc: "GymLib, Moka.care, budget formation — jamais traduits en €." },
  ];
  return (
    <section className="py-20 md:py-28 bg-[#FAF8F5] px-5 scroll-reveal">
      <div className="max-w-5xl mx-auto text-center">
        <Tag>Le problème</Tag>
        <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
          1 offre sur 3 est déclinée au closing.
          <br />
          <span className="text-[#8B7FA8]">Pas parce que l'offre est mauvaise.</span>
          <br />
          Parce qu'elle est mal valorisée.
        </h2>
        <div className="mt-6 inline-block px-5 py-3 rounded-2xl bg-white border border-[rgba(45,38,64,0.08)]">
          <span className="font-display text-[28px] text-[#C4A882]">15 000 – 50 000 €</span>
          <div className="text-[12px] text-[#9B97A0] mt-1">coût moyen d'un recrutement raté</div>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <div
              key={it.title}
              className="feature-card scroll-reveal p-6 bg-white border border-[rgba(45,38,64,0.08)] rounded-2xl text-left"
              style={{ ["--reveal-delay" as never]: `${i * 120}ms` }}
            >
              <div className="text-3xl">{it.icon}</div>
              <h3 className="mt-3 font-display text-[20px] text-[#2D2640]">{it.title}</h3>
              <p className="mt-2 text-[14px] text-[#524970] font-light leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Last Mile — positioning vs ATS                     */
/* -------------------------------------------------- */
function LastMileSection() {
  const atsSteps = [
    { label: "Sourcing", tool: "LinkedIn, WTJ" },
    { label: "Tri & scoring", tool: "Votre ATS" },
    { label: "Entretiens", tool: "Votre ATS" },
    { label: "Décision interne", tool: "Votre ATS" },
  ];
  return (
    <section className="relative py-20 md:py-28 bg-[#F0EBE8] px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-1 -top-20 right-1/4 w-[360px] h-[360px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.25), transparent 70%)" }} />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          <Tag>Positionnement</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Le dernier mètre du recrutement.
            <br />
            <span className="text-[#8B7FA8]">Celui que votre ATS oublie.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] text-[#524970] font-light max-w-2xl mx-auto">
            Les ATS gèrent le sourcing, le tri, les entretiens. Mais entre la décision interne
            et la signature du candidat, il reste un trou noir. Paqli s'y installe.
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="mt-14 relative">
          {/* ATS chain */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-2 items-stretch">
            {atsSteps.map((s, i) => (
              <div key={s.label} className="relative">
                <div className="h-full p-4 rounded-2xl bg-white border border-[rgba(45,38,64,0.08)] text-left">
                  <div className="text-[10px] uppercase tracking-wider text-[#9B97A0]">Étape {i + 1}</div>
                  <div className="mt-1 font-display text-[15px] md:text-[16px] text-[#2D2640]">{s.label}</div>
                  <div className="mt-1 text-[11px] text-[#524970] font-light">{s.tool}</div>
                </div>
                {/* Arrow between steps (desktop) */}
                <div className="hidden md:block absolute top-1/2 -right-1 -translate-y-1/2 text-[#C4A882] text-[14px] z-10">→</div>
              </div>
            ))}

            {/* Paqli — the last mile */}
            <div className="relative col-span-2 md:col-span-1">
              <div className="h-full p-4 rounded-2xl bg-[#2D2640] text-white border border-[rgba(196,168,130,0.4)] shadow-[0_10px_40px_rgba(45,38,64,0.25)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(196,168,130,0.18)] to-transparent" />
                <div className="relative">
                  <div className="text-[10px] uppercase tracking-wider text-[#C4A882] font-medium">Le dernier mètre</div>
                  <div className="mt-1 font-display text-[15px] md:text-[16px]">Closing candidat</div>
                  <div className="mt-1 text-[11px] text-[#B8AECF] font-light">Paqli</div>
                </div>
              </div>
              {/* Pulse ring */}
              <span className="ping-soft absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#C4A882]" />
            </div>
          </div>

          {/* Caption row */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-2 text-[11px] text-[#9B97A0]">
            <div className="md:col-span-4 text-center md:text-left italic">
              ↑ Ce que votre ATS fait déjà très bien
            </div>
            <div className="col-span-2 md:col-span-1 text-center md:text-left font-medium text-[#2D2640]">
              ↑ Là où 1 offre sur 3 se perd
            </div>
          </div>
        </div>

        {/* Three pillars */}
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            { icon: "🔌", title: "Complémentaire, pas concurrent", desc: "Paqli s'intègre à votre ATS (Greenhouse, Lever, Teamtailor…). On ne remplace rien." },
            { icon: "🎯", title: "Une seule mission : closer", desc: "Du « OK on lui fait une offre » au « C'est signé ». Tout ce qui se passe entre les deux." },
            { icon: "📈", title: "Le KPI qui manquait", desc: "Taux d'acceptation, temps de décision, signaux d'hésitation. Mesurez ce que votre ATS ignore." },
          ].map((p, i) => (
            <div
              key={p.title}
              className="feature-card scroll-reveal p-6 bg-white border border-[rgba(45,38,64,0.08)] rounded-2xl"
              style={{ ["--reveal-delay" as never]: `${i * 100}ms` }}
            >
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-3 font-display text-[18px] text-[#2D2640]">{p.title}</h3>
              <p className="mt-2 text-[13px] text-[#524970] font-light leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Solution                                           */
/* -------------------------------------------------- */
function SolutionSection() {
  const [view, setView] = useState<"entreprise" | "candidat">("entreprise");

  const parcoursEntreprise = [
    { n: 1, icon: "⚙️", title: "Vous configurez", desc: "L'offre, l'équipe, les avantages, le package" },
    { n: 2, icon: "🔗", title: "Vous partagez", desc: "Un espace candidat unique et sécurisé" },
    { n: 3, icon: "📊", title: "Vous suivez", desc: "Les signaux Paq en temps réel" },
    { n: 4, icon: "✅", title: "Vous closez", desc: "Avec une promesse d'embauche signée" },
  ];
  const parcoursCandidat = [
    { n: 1, icon: "📩", title: "Il reçoit", desc: "Son espace dédié, sur mobile" },
    { n: 2, icon: "🧭", title: "Il découvre", desc: "L'entreprise, l'équipe, le poste" },
    { n: 3, icon: "🧮", title: "Il explore", desc: "Le package et ses avantages en interactif" },
    { n: 4, icon: "🤝", title: "Il accepte", desc: "En toute confiance" },
  ];

  const isEnt = view === "entreprise";
  const steps = isEnt ? parcoursEntreprise : parcoursCandidat;
  const accent = isEnt ? "#C4A882" : "#8B7FA8";

  return (
    <section className="relative py-20 md:py-28 bg-[#2D2640] px-5 text-white scroll-reveal overflow-hidden">
      <div className="orb orb-1 top-10 -left-32 w-[400px] h-[400px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.35), transparent 70%)" }} />
      <div className="orb orb-2 -bottom-20 -right-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.25), transparent 70%)" }} />
      <div className="relative max-w-5xl mx-auto">
        <div className="text-center">
          <Tag dark>La solution Paqli</Tag>
          <h2 className="mt-4 font-display leading-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
            Une conversation transparente,
            <br />
            <span className="text-[#C4A882]">pas un PDF.</span>
          </h2>
          <p className="mt-5 text-[15px] text-[#B8AECF] font-light max-w-2xl mx-auto">
            Deux parcours synchronisés. Un seul lien. Zéro friction.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[#3D3554] border border-[rgba(255,255,255,0.08)]">
            {(["entreprise", "candidat"] as const).map((v) => {
              const active = view === v;
              const a = v === "entreprise" ? "#C4A882" : "#8B7FA8";
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="relative px-5 py-2 rounded-full text-[13px] font-medium tracking-wide transition-all"
                  style={{
                    color: active ? "#2D2640" : "#B8AECF",
                    background: active ? a : "transparent",
                  }}
                >
                  Vue {v}
                </button>
              );
            })}
          </div>
        </div>

        <div key={view} className="mt-12 animate-paqli-slide-up">
          <div className="hidden md:flex items-start justify-between relative">
            <div className="absolute top-7 left-[6%] right-[6%] h-px bg-[rgba(255,255,255,0.15)]" />
            {steps.map((s) => (
              <div key={s.n} className="relative flex-1 text-center px-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#3D3554] border border-[rgba(255,255,255,0.15)] flex items-center justify-center text-2xl relative z-10">
                  {s.icon}
                </div>
                <div className="mt-3 text-[12px] font-medium" style={{ color: accent }}>ÉTAPE {s.n}</div>
                <div className="mt-1 font-display text-[18px]">{s.title}</div>
                <div className="text-[12px] text-[#B8AECF] font-light">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="md:hidden space-y-3 text-left">
            {steps.map((s) => (
              <div key={s.n} className="flex items-center gap-4 p-4 bg-[#3D3554] rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#2D2640] flex items-center justify-center text-xl">{s.icon}</div>
                <div>
                  <div className="text-[11px] font-medium" style={{ color: accent }}>ÉTAPE {s.n}</div>
                  <div className="font-display text-[17px]">{s.title}</div>
                  <div className="text-[12px] text-[#B8AECF] font-light">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Experience — Candidate experience as brand        */
/* -------------------------------------------------- */
function ExperienceSection() {
  const moments = [
    { icon: "📩", label: "Le premier email", before: "« Voici le PDF en PJ »", after: "« Voici votre espace dédié »" },
    { icon: "📱", label: "Le soir, dans le canapé", before: "PDF illisible sur mobile", after: "Espace responsive, fluide" },
    { icon: "🤔", label: "Le doute du dimanche", before: "Email sans réponse", after: "Paq répond, instantanément" },
    { icon: "💬", label: "La discussion avec son/sa conjoint·e", before: "« J'ai pas trop compris »", after: "« Regarde, tout est là »" },
  ];
  return (
    <section className="relative py-20 md:py-28 bg-[#F0EBE8] px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-1 -top-32 -right-32 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.22), transparent 70%)" }} />
      <div className="orb orb-2 -bottom-20 -left-20 w-[360px] h-[360px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.2), transparent 70%)" }} />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          <Tag>Expérience candidat</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Votre marque employeur
            <br />
            <span className="text-[#8B7FA8]">se joue avant la signature.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] text-[#524970] font-light max-w-2xl mx-auto">
            Pas dans les vidéos « life at », ni dans les goodies du Welcome Pack.
            Elle se joue dans l'expérience que vit votre candidat — sur son téléphone, le dimanche soir,
            au moment où il décide.
          </p>
        </div>

        {/* Moments grid */}
        <div className="mt-14 grid md:grid-cols-2 gap-4">
          {moments.map((m, i) => (
            <div
              key={m.label}
              className="scroll-reveal p-5 md:p-6 bg-white rounded-2xl border border-[rgba(45,38,64,0.08)]"
              style={{ ["--reveal-delay" as never]: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] flex items-center justify-center text-[18px]">{m.icon}</div>
                <div className="text-[11px] uppercase tracking-wider text-[#9B97A0] font-medium">{m.label}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[rgba(184,90,106,0.06)] border border-[rgba(184,90,106,0.15)]">
                  <div className="text-[10px] uppercase tracking-wider text-[#B85A6A] font-medium">Sans Paqli</div>
                  <p className="mt-1.5 text-[13px] text-[#524970] font-light italic leading-snug">{m.before}</p>
                </div>
                <div className="p-3 rounded-xl bg-[rgba(59,109,17,0.06)] border border-[rgba(59,109,17,0.18)]">
                  <div className="text-[10px] uppercase tracking-wider text-[#3B6D11] font-medium">Avec Paqli</div>
                  <p className="mt-1.5 text-[13px] text-[#2D2640] font-medium leading-snug">{m.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote bar */}
        <div className="mt-12 p-6 md:p-8 rounded-2xl bg-[#2D2640] text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(196,168,130,0.1)] to-transparent" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-wider text-[#C4A882] font-medium">Le nouveau standard</div>
            <p className="mt-3 font-display text-[20px] md:text-[26px] leading-snug max-w-3xl mx-auto">
              « Une expérience candidat exceptionnelle vaut mieux que dix posts LinkedIn sur la culture d'entreprise. »
            </p>
            <p className="mt-4 text-[13px] text-[#B8AECF] font-light">
              Onboarding, fidélisation, parrainage : tout commence ici.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Product tabs                                       */
/* -------------------------------------------------- */
function ProductSection() {
  const tabs = [
    {
      id: "config",
      label: "RH — Configurateur",
      desc: "Espace candidat complet en 5 minutes : offre, équipe, avantages, package. Score Paq instantané.",
      mockup: (
        <div className="p-6 bg-white rounded-xl border border-[rgba(45,38,64,0.08)]">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-[#9B97A0]">Étape 3 / 5</div>
            <div className="text-[12px] text-[#8B7FA8]">Score Paq <span className="font-medium text-[#2D2640]">78/100</span></div>
          </div>
          <div className="mt-4 space-y-2">
            <FieldRow label="Fixe annuel" value="75 000 €" />
            <FieldRow label="Variable" value="10 000 €" />
            <FieldRow label="BSPCE" value="0,15 %" />
            <FieldRow label="PEE abondé" value="3 768 €" />
          </div>
          <div className="mt-4 p-3 bg-[#FAF8F5] rounded-lg text-[12px] text-[#524970]">
            💡 <span className="font-medium text-[#2D2640]">Conseil de Paq :</span> Ajoutez un budget formation pour augmenter le score de +8 pts.
          </div>
        </div>
      ),
    },
    {
      id: "candidat",
      label: "Candidat — Simulation",
      desc: "Rémunération globale interactive. Le candidat comprend sa valeur en temps réel.",
      mockup: (
        <div className="p-6 bg-white rounded-xl border border-[rgba(45,38,64,0.08)]">
          <div className="text-[11px] uppercase tracking-wider text-[#9B97A0]">Rémunération globale</div>
          <div className="font-display text-[44px] text-[#2D2640] leading-none mt-1">~102 000 €</div>
          <div className="mt-4 space-y-2">
            <FieldRow label="Fixe net" value="43 300 €" green />
            <FieldRow label="Variable net" value="5 800 €" green />
            <FieldRow label="BSPCE (réaliste)" value="38 000 €" green />
            <FieldRow label="PEE abondé" value="3 768 €" green />
            <FieldRow label="🏋️ GymLib + Moka + Formation" value="3 080 €" green />
          </div>
        </div>
      ),
    },
    {
      id: "dashboard",
      label: "RH — Dashboard",
      desc: "Signaux d'engagement, alertes Paq, \"Que faire maintenant ?\"",
      mockup: (
        <div className="p-6 bg-white rounded-xl border border-[rgba(45,38,64,0.08)]">
          <div className="text-[11px] uppercase tracking-wider text-[#9B97A0]">3 candidats actifs</div>
          <div className="mt-3 space-y-2">
            {[
              { name: "Thomas B.", score: 82, status: "🔥 Très engagé" },
              { name: "Sarah L.", score: 56, status: "💭 En réflexion" },
              { name: "Marc D.", score: 28, status: "⚠️ Relancer" },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between p-3 bg-[#FAF8F5] rounded-lg">
                <div>
                  <div className="text-[13px] font-medium text-[#2D2640]">{c.name}</div>
                  <div className="text-[11px] text-[#9B97A0]">{c.status}</div>
                </div>
                <div className="text-[14px] font-display text-[#8B7FA8]">{c.score}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active)!;

  return (
    <section id="produit" className="py-20 md:py-28 bg-[#FAF8F5] px-5 scroll-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <Tag>Produit</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Trois écrans qui transforment
            <br />
            <span className="text-[#8B7FA8]">votre closing</span>
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                active === t.id
                  ? "bg-[#2D2640] text-white"
                  : "bg-white text-[#524970] border border-[rgba(45,38,64,0.1)] hover:border-[#8B7FA8]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-[1fr_1.4fr] gap-8 items-center">
          <p className="text-[16px] text-[#524970] font-light leading-relaxed">{current.desc}</p>
          <div key={active} className="animate-[fade-in_0.3s_ease-out]">{current.mockup}</div>
        </div>
      </div>
    </section>
  );
}

function FieldRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between items-center text-[13px] py-1.5 border-b border-[rgba(45,38,64,0.05)] last:border-0">
      <span className="text-[#524970]">{label}</span>
      <span className={`font-medium ${green ? "text-[#3B6D11]" : "text-[#2D2640]"}`}>{value}</span>
    </div>
  );
}

/* -------------------------------------------------- */
/* Total Compensation                                 */
/* -------------------------------------------------- */
function TotalCompSection() {
  return (
    <section className="relative py-20 md:py-28 bg-[#2D2640] text-white px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-2 top-20 -right-40 w-[500px] h-[500px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.3), transparent 70%)" }} />
      <div className="orb orb-1 -bottom-20 -left-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.3), transparent 70%)" }} />
      <div className="relative max-w-5xl mx-auto">
        <div className="text-center">
          <Tag dark>Différenciateur</Tag>
          <h2 className="mt-4 font-display leading-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
            La vraie valeur de votre offre,
            <br />
            <span className="text-[#C4A882]">enfin visible.</span>
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#3D3554] border border-[rgba(255,255,255,0.08)]">
            <div className="text-[11px] uppercase tracking-wider text-[#9B97A0]">Avant Paqli</div>
            <p className="mt-3 font-display text-[20px] leading-snug">
              "Fixe 75k€, BSPCE, PEE abondé"
            </p>
            <p className="mt-3 text-[14px] text-[#B8AECF] font-light italic">
              Candidat : "C'est bien... je crois ?"
            </p>
            <div className="mt-6 inline-block px-3 py-1.5 rounded-full bg-[rgba(184,90,106,0.2)] text-[12px] text-[#E8A6B0]">
              7 jours de silence
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#FAF8F5] text-[#2D2640]">
            <div className="text-[11px] uppercase tracking-wider text-[#9B97A0]">Après Paqli</div>
            <div className="mt-3 space-y-2">
              <CompRow label="Fixe net estimé" value="~48 000 €" />
              <CompRow label="Variable net" value="~5 800 €" />
              <CompRow label="BSPCE réaliste" value="~38 000 €" />
              <CompRow label="PEE abondé" value="~3 768 €" />
              <CompRow label="🏋️ GymLib" value="~480 €/an" />
              <CompRow label="🧠 Moka.care" value="~600 €/an" />
              <CompRow label="📚 Formation" value="~2 000 €/an" />
            </div>
            <div className="mt-4 pt-4 border-t border-[rgba(45,38,64,0.1)] flex justify-between items-center">
              <span className="font-display text-[16px]">Rémunération globale</span>
              <span className="font-display text-[22px] text-[#3B6D11]">~102 000 €</span>
            </div>
            <div className="mt-3 inline-block px-3 py-1.5 rounded-full bg-[rgba(59,109,17,0.12)] text-[12px] text-[#3B6D11] font-medium">
              Candidat a accepté ✅
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-[14px] md:text-[16px] text-[#B8AECF] font-light italic max-w-3xl mx-auto">
          "Ces avantages représentent l'équivalent de +12% sur le fixe — sans le dire, c'est un argument de closing perdu."
        </p>
      </div>
    </section>
  );
}

function CompRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-[#524970]">{label}</span>
      <span className="font-medium text-[#3B6D11]">{value}</span>
    </div>
  );
}

/* -------------------------------------------------- */
/* AI features                                        */
/* -------------------------------------------------- */
function AISection() {
  const rhFeatures = [
    { icon: "✨", title: "Score d'attractivité", desc: "Diagnostic instantané de votre offre vs marché. Points forts, alertes, axes d'amélioration." },
    { icon: "🎯", title: "Conseil de valorisation", desc: "Paq suggère quoi mettre en avant pour ce candidat — equity, formation, flexibilité." },
    { icon: "🧠", title: "Signaux comportementaux", desc: "« Thomas a passé 4 min sur l'equity. » Détecte les hésitations, prédit l'intention." },
    { icon: "💬", title: "Messages signés Paq", desc: "Personnalisés selon le comportement du candidat. Un clic, pas 20 minutes." },
  ];
  const candidatFeatures = [
    { icon: "🤖", title: "Assistant 24/7", desc: "Une question sur les BSPCE, le PEE, la mutuelle ? Réponse instantanée, sourcée, neutre." },
    { icon: "📊", title: "Simulations personnalisées", desc: "Net après impôt, valorisation equity, projections sur 4 ans — adaptées à sa situation." },
    { icon: "⚖️", title: "Comparaison éclairée", desc: "Paq replace l'offre dans son marché : « Votre fixe est au P75 du marché Series B Paris. »" },
    { icon: "💡", title: "Aide à la décision", desc: "Synthèse claire des points forts, des questions à poser, des éléments à négocier." },
  ];

  const Pillar = ({
    label,
    title,
    accent,
    items,
    align,
  }: {
    label: string;
    title: string;
    accent: string;
    items: { icon: string; title: string; desc: string }[];
    align: "left" | "right";
  }) => (
    <div className="relative p-6 md:p-8 rounded-3xl bg-white border border-[rgba(45,38,64,0.08)] shadow-[0_4px_30px_rgba(45,38,64,0.04)]">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="inline-block px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase"
          style={{ background: `${accent}1F`, color: accent, border: `1px solid ${accent}40` }}
        >
          {label}
        </span>
        <div className="flex-1 h-px bg-[rgba(45,38,64,0.08)]" />
      </div>
      <h3 className="font-display text-[#2D2640] leading-tight" style={{ fontSize: "clamp(22px, 2.4vw, 28px)" }}>
        {title}
      </h3>
      <div className="mt-6 space-y-4">
        {items.map((f, i) => (
          <div
            key={f.title}
            className="scroll-reveal flex items-start gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[rgba(45,38,64,0.05)]"
            style={{ ["--reveal-delay" as never]: `${i * 80}ms` }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[18px]"
              style={{ background: `${accent}1A` }}
            >
              {f.icon}
            </div>
            <div className={align === "right" ? "text-left" : "text-left"}>
              <div className="font-display text-[16px] text-[#2D2640]">{f.title}</div>
              <p className="mt-1 text-[13px] text-[#524970] font-light leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="relative py-20 md:py-28 bg-[#FAF8F5] px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-1 -top-20 -left-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.18), transparent 70%)" }} />
      <div className="orb orb-2 -bottom-20 -right-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.18), transparent 70%)" }} />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          <Tag>L'Agent Paq</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Paq, l'agent qui éclaire les deux côtés
            <br />
            <span className="text-[#8B7FA8]">de la table.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] text-[#524970] font-light max-w-2xl mx-auto">
            Côté RH, elle valorise. Côté candidat, elle éclaire.
            Un seul agent, deux missions, zéro biais.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6 relative">
          <Pillar
            label="Côté RH"
            title="Valorisez chaque élément de votre offre."
            accent="#C4A882"
            items={rhFeatures}
            align="left"
          />
          <Pillar
            label="Côté Candidat"
            title="Décidez en confiance, sans pression."
            accent="#8B7FA8"
            items={candidatFeatures}
            align="right"
          />

          {/* Connecting node (desktop) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-[#2D2640] text-white items-center justify-center font-display text-[20px] shadow-[0_8px_30px_rgba(45,38,64,0.25)] border-2 border-[#C4A882]">
            Paq
          </div>
        </div>

        <p className="mt-10 text-center text-[13px] text-[#9B97A0] italic">
          Aucun coaching biaisé. Paq est neutre, sourcé et factuel des deux côtés.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Control — RH reassurance                          */
/* -------------------------------------------------- */
function ControlSection() {
  const guarantees = [
    {
      icon: "🎛️",
      title: "Vous contrôlez ce qui s'affiche",
      desc: "Chaque élément du package, chaque avantage, chaque chiffre : vous décidez ce qui est visible. Paqli n'expose rien sans votre validation.",
    },
    {
      icon: "🔒",
      title: "Aucune info confidentielle révélée",
      desc: "Paq ne compare jamais à des offres concurrentes nominatives. Pas de fuite salariale, pas de grille interne exposée. Vous gardez la main.",
    },
    {
      icon: "🤝",
      title: "Paq ne négocie pas à votre place",
      desc: "L'agent informe, simule, clarifie. Mais il oriente toujours vers votre RH pour la négociation. Aucune contre-proposition générée.",
    },
    {
      icon: "📊",
      title: "Vos données, vos règles",
      desc: "Hébergement EU, conformité RGPD, suppression à la demande. Vos packages et vos candidats restent vôtres.",
    },
  ];

  return (
    <section className="relative py-20 md:py-28 bg-[#2D2640] text-white px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-1 -top-20 -right-20 w-[420px] h-[420px]" style={{ background: "radial-gradient(circle, rgba(196,168,130,0.22), transparent 70%)" }} />
      <div className="orb orb-2 -bottom-20 -left-20 w-[360px] h-[360px]" style={{ background: "radial-gradient(circle, rgba(139,127,168,0.25), transparent 70%)" }} />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          <Tag dark>Pour les RH exigeants</Tag>
          <h2 className="mt-4 font-display leading-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
            Transparent pour le candidat.
            <br />
            <span className="text-[#C4A882]">Sous contrôle pour vous.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] text-[#B8AECF] font-light max-w-2xl mx-auto">
            La transparence ne se fait jamais contre vous. Paqli est un outil d'entreprise :
            vous gardez la main sur le contenu, la négociation et la donnée.
          </p>
        </div>

        {/* Guarantees grid */}
        <div className="mt-12 grid md:grid-cols-2 gap-4">
          {guarantees.map((g, i) => (
            <div
              key={g.title}
              className="scroll-reveal flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-[#3D3554] border border-[rgba(255,255,255,0.08)]"
              style={{ ["--reveal-delay" as never]: `${i * 100}ms` }}
            >
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[rgba(196,168,130,0.15)] border border-[rgba(196,168,130,0.3)] flex items-center justify-center text-[20px]">
                {g.icon}
              </div>
              <div>
                <h3 className="font-display text-[17px]">{g.title}</h3>
                <p className="mt-1.5 text-[13px] text-[#B8AECF] font-light leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Outcome bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 p-6 md:p-8 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] backdrop-blur-sm">
          {[
            { kpi: "+25%", label: "taux d'acceptation moyen" },
            { kpi: "-40%", label: "temps de décision candidat" },
            { kpi: "0", label: "négociation menée par l'IA" },
            { kpi: "100%", label: "contrôle RH sur l'affichage" },
          ].map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="font-display text-[24px] md:text-[30px] text-[#C4A882]">{s.kpi}</div>
              <div className="text-[11px] md:text-[12px] text-[#B8AECF] font-light mt-1 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-[#B8AECF] italic font-light">
          La transparence augmente le closing. Pas l'inverse.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Testimonials                                       */
/* -------------------------------------------------- */
function TestimonialsSection() {
  const items = [
    {
      quote: "Avant Paqli, j'envoyais un PDF et j'attendais. Maintenant je vois en temps réel si le candidat s'est intéressé à l'equity. Notre taux d'acceptation a augmenté de 22%.",
      name: "Sophie R.", role: "Head of People · Scale-up Série B", color: "#8B7FA8",
    },
    {
      quote: "Le simulateur BSPCE a changé la donne. Les candidats comprennent enfin ce que leurs bons valent. On a closé 3 profils senior en 2 semaines.",
      name: "Marc D.", role: "Talent Acquisition Lead · Startup tech", color: "#C4A882",
    },
    {
      quote: "On avait des avantages formidables — GymLib, Moka.care, 3 000€ de formation — mais personne ne les calculait. Maintenant tout est visible en un lien.",
      name: "Camille L.", role: "DRH · ETI tech", color: "#3D3554",
    },
  ];
  return (
    <section id="temoignages" className="py-20 md:py-28 bg-[#F0EBE8] px-5 scroll-reveal">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <Tag>Témoignages</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Ils closent mieux avec Paqli
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <div
              key={t.name}
              className="feature-card scroll-reveal p-6 bg-white rounded-2xl border border-[rgba(139,127,168,0.2)]"
              style={{ ["--reveal-delay" as never]: `${i * 120}ms` }}
            >
              <div className="text-[#C4A882] text-[14px]">★★★★★</div>
              <p className="mt-3 font-display italic text-[16px] text-[#2D2640] leading-relaxed">
                "{t.quote}"
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-display text-[16px]" style={{ background: t.color }}>
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[#2D2640]">{t.name}</div>
                  <div className="text-[11px] text-[#9B97A0]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-[12px] text-[#9B97A0] italic">
          Retours de nos premiers utilisateurs · Beta 2026
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Pricing                                            */
/* -------------------------------------------------- */
function PricingSection({ onDemo }: { onDemo: () => void }) {
  const [tab, setTab] = useState<"ppu" | "sub">("ppu");
  const plans = [
    { name: "Starter", price: "199 €", credits: "10 crédits offerts", cta: "Commencer", featured: false },
    { name: "Growth", price: "490 €", credits: "25 crédits offerts", cta: "Commencer", featured: true },
    { name: "Scale", price: "Sur devis", credits: "Volume négocié · SLA dédié · Onboarding", cta: "Nous contacter", featured: false },
  ];
  const faqs = [
    { q: "Qu'est-ce qu'un espace candidat ?", a: "Un espace dédié, accessible via un lien unique, qui regroupe tout ce dont votre candidat a besoin : l'offre, l'entreprise, l'équipe, les avantages, le package interactif et un espace d'échange. Valable jusqu'à décision." },
    { q: "Y a-t-il un engagement ?", a: "Non. Vous achetez des crédits que vous consommez à votre rythme. Aucune mensualité, aucune durée minimale." },
    { q: "Puis-je changer de plan ?", a: "Oui, à tout moment. Vos crédits restants sont conservés." },
    { q: "Comment fonctionne le setup fee ?", a: "Le setup fee couvre l'onboarding, la personnalisation de vos templates et l'import de vos avantages. C'est un paiement unique." },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#FAF8F5] px-5 scroll-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <Tag>Tarifs</Tag>
          <h2 className="mt-4 font-display text-[#2D2640]" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}>
            Simple, transparent,
            <br />
            <span className="text-[#8B7FA8]">à la consommation</span>
          </h2>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex p-1 bg-white border border-[rgba(45,38,64,0.08)] rounded-xl">
            <button
              onClick={() => setTab("ppu")}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${tab === "ppu" ? "bg-[#2D2640] text-white" : "text-[#524970]"}`}
            >
              Pay-per-use
            </button>
            <button
              onClick={() => setTab("sub")}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${tab === "sub" ? "bg-[#2D2640] text-white" : "text-[#524970]"}`}
            >
              Abonnement
            </button>
          </div>
        </div>

        {tab === "ppu" ? (
          <>
            <div className="mt-10 grid md:grid-cols-3 gap-5">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`p-6 rounded-2xl border ${
                    p.featured
                      ? "bg-[#2D2640] text-white border-[#2D2640] relative"
                      : "bg-white border-[rgba(45,38,64,0.08)]"
                  }`}
                >
                  {p.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#C4A882] text-[#2D2640] text-[11px] font-medium">
                      ⭐ Le plus choisi
                    </div>
                  )}
                  <div className={`text-[14px] font-medium ${p.featured ? "text-[#C4A882]" : "text-[#524970]"}`}>{p.name}</div>
                  <div className={`mt-2 font-display text-[36px] leading-none ${p.featured ? "text-white" : "text-[#2D2640]"}`}>
                    {p.price}
                  </div>
                  <div className={`mt-1 text-[12px] ${p.featured ? "text-[#B8AECF]" : "text-[#9B97A0]"}`}>
                    one-time
                  </div>
                  <p className={`mt-4 text-[13px] ${p.featured ? "text-[#B8AECF]" : "text-[#524970]"}`}>
                    + {p.credits}
                  </p>
                  <button
                    onClick={onDemo}
                    className={`mt-6 w-full py-3 rounded-xl text-[13px] font-medium transition ${
                      p.featured
                        ? "bg-white text-[#2D2640] hover:bg-[#F0EBE8]"
                        : "bg-[#2D2640] text-white hover:bg-[#3D3554]"
                    }`}
                  >
                    {p.cta}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 rounded-2xl bg-white border border-[rgba(45,38,64,0.08)] text-center">
              <div className="text-[12px] uppercase tracking-wider text-[#9B97A0]">Puis par lien candidat</div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px] text-[#2D2640]">
                <span>1 lien = <span className="font-medium">25 €</span></span>
                <span>·</span>
                <span>Pack 10 = <span className="font-medium">199 €</span></span>
                <span>·</span>
                <span>Pack 25 = <span className="font-medium">399 €</span></span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-10 p-8 rounded-2xl bg-white border border-[rgba(45,38,64,0.08)] text-center">
            <p className="text-[15px] text-[#524970]">
              Abonnements mensuels disponibles à partir de 290 €/mois (15 liens inclus). Contactez-nous pour un devis personnalisé.
            </p>
            <button
              onClick={onDemo}
              className="mt-5 px-6 py-3 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium hover:bg-[#3D3554] transition-colors"
            >
              Discuter d'un abonnement →
            </button>
          </div>
        )}

        <div className="mt-14">
          <h3 className="text-center font-display text-[24px] text-[#2D2640]">Questions fréquentes</h3>
          <div className="mt-6 space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="bg-white border border-[rgba(45,38,64,0.08)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left"
                >
                  <span className="text-[14px] font-medium text-[#2D2640]">{f.q}</span>
                  <span className={`text-[#8B7FA8] transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-[13px] text-[#524970] font-light leading-relaxed animate-[fade-in_0.2s_ease-out]">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* Final CTA + Footer                                 */
/* -------------------------------------------------- */
function MidCTA({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="py-14 md:py-16 bg-[#FAF8F5] px-5 scroll-reveal">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-[#2D2640]" style={{ fontSize: "clamp(24px, 3vw, 32px)", lineHeight: 1.2 }}>
          Prêt à montrer la vraie valeur de votre package ?
        </h2>
        <button
          onClick={onDemo}
          className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-[#2D2640] text-white rounded-xl text-[14px] font-medium hover:bg-[#3D3554] transition-colors"
        >
          Demander une démo gratuite →
        </button>
        <p className="mt-4 text-[12px] text-[#9B97A0]">
          20 minutes · Sans engagement · Réponse sous 24h
        </p>
      </div>
    </section>
  );
}

function FinalCTA({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative py-20 md:py-28 bg-[#2D2640] text-white px-5 scroll-reveal overflow-hidden">
      <div className="orb orb-1 top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]" style={{ background: "radial-gradient(ellipse, rgba(196,168,130,0.25), transparent 70%)" }} />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="font-display leading-tight" style={{ fontSize: "clamp(32px, 4.5vw, 52px)" }}>
          Prêt à closer <span className="text-aurora">mieux ?</span>
        </h2>
        <p className="mt-4 text-[16px] text-[#B8AECF] font-light">
          Rejoignez les équipes talent qui utilisent Paqli pour transformer leurs offres en décisions éclairées.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onDemo}
            className="cta-primary px-7 py-3.5 bg-white text-[#2D2640] rounded-xl text-[15px] font-medium hover:bg-[#F0EBE8] transition-colors"
          >
            Demander une démo →
          </button>
          <Link
            to="/login"
            className="px-7 py-3.5 border border-[rgba(255,255,255,0.25)] text-white rounded-xl text-[15px] font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            Se connecter
          </Link>
        </div>
        <div className="mt-6 text-[12px] text-[#B8AECF]">
          <span className="text-[#C4A882]">★★★★★</span> &nbsp;50+ équipes RH · Données fiscales 2026 · Sans engagement
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#FAF8F5] border-t border-[rgba(45,38,64,0.08)] py-14 px-5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10">
        <div>
          <div className="font-display text-[24px] text-[#2D2640]">paqli</div>
          <div className="text-[12px] text-[#9B97A0] mt-1">paqli.fr</div>
          <p className="mt-3 text-[13px] text-[#524970] font-light leading-relaxed">
            La vraie valeur de votre offre, enfin visible.
          </p>
        </div>
        <FooterCol title="Produit" links={["Fonctionnalités", "Tarifs", "Démo"]} />
        <FooterCol title="Ressources" links={["Blog", "Guides", "Changelog"]} />
        <FooterCol title="Légal" links={["Mentions légales", "Politique de confidentialité", "CGU"]} />
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[rgba(45,38,64,0.08)] text-[12px] text-[#9B97A0]">
        © 2026 Paqli — AMF/ACPR via Perlib
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wider text-[#2D2640] font-medium">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-[13px] text-[#524970] hover:text-[#2D2640] transition-colors">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------- */
/* Page                                               */
/* -------------------------------------------------- */
function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#FAF8F5] text-[#2D2640] font-sans">
      <Navbar onDemo={openDemo} />
      <Hero onDemo={openDemo} />
      <LogoBar />
      <ProblemSection />
      <LastMileSection />
      <SolutionSection />
      <ProductSection />
      <TotalCompSection />
      <MidCTA onDemo={openDemo} />
      <AISection />
      <TestimonialsSection />
      <PricingSection onDemo={openDemo} />
      <FinalCTA onDemo={openDemo} />
      <Footer />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}
