interface Sections {
  legal: number;
  presentation: number;
  keyFigures: number;
  values: number;
  testimonials: number;
}

export function ProfileCompletenessBar({
  score,
  sections,
}: {
  score: number;
  sections: Sections;
}) {
  const impactMessage =
    score >= 80
      ? "Profil excellent — expérience candidat optimale"
      : score >= 60
        ? "Profil partiel — complétez les sections manquantes pour +18% d'engagement"
        : "Profil incomplet — les candidats voient une page moins convaincante";

  const wrapClass =
    score >= 80
      ? "text-[#27500A] bg-[#EAF3DE] border-[rgba(59,109,17,0.15)]"
      : score >= 60
        ? "text-[#633806] bg-[#FAEEDA] border-[rgba(196,168,130,0.2)]"
        : "text-[#A32D2D] bg-[#FCEBEB] border-[rgba(184,90,106,0.2)]";

  const barColor = score >= 80 ? "#3B6D11" : score >= 60 ? "#C4A882" : "#B85A6A";

  const items: Array<[string, number]> = [
    ["Identité", sections.legal],
    ["Présentation", sections.presentation],
    ["Chiffres", sections.keyFigures],
    ["Valeurs", sections.values],
    ["Citations", sections.testimonials],
  ];

  return (
    <div className={`rounded-xl px-5 py-4 border ${wrapClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-medium">Complétude du profil entreprise</div>
          <div className="text-[12px] font-light mt-0.5 opacity-80">{impactMessage}</div>
        </div>
        <div className="font-serif text-[32px] leading-none" style={{ color: barColor }}>
          {score}%
        </div>
      </div>
      <div className="h-2 bg-white/40 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map(([label, p]) => (
          <div key={label} className="text-center">
            <div
              className="h-1 rounded-full mb-1.5"
              style={{
                background: p >= 80 ? "#3B6D11" : p >= 40 ? "#C4A882" : "rgba(255,255,255,0.4)",
              }}
            />
            <div className="text-[9px] opacity-70">{label}</div>
            <div className="text-[10px] font-medium">{p}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
