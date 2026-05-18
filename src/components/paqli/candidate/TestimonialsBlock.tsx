export interface PublicTestimonial {
  first_name: string;
  job_title: string;
  seniority_years: number | null;
  quote: string;
  quote_context: string | null;
  avatar_url: string | null;
}

export function TestimonialsBlock({
  testimonials,
  orgName,
}: {
  testimonials: PublicTestimonial[] | undefined | null;
  orgName: string | null;
}) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <>
      <div className="font-display text-aubergine mb-3 mt-6" style={{ fontSize: 18 }}>
        Ils travaillent {orgName ? `chez ${orgName}` : "ici"}
      </div>
      <div className="space-y-3 mb-3">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="bg-white border-[0.5px] border-[rgba(45,38,64,0.08)] rounded-[12px] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.first_name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#F0EBE8]"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#F5F2FA] flex items-center justify-center font-serif text-[18px] text-[#8B7FA8] border-2 border-[#EDE9F5]">
                    {t.first_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-aubergine font-light leading-relaxed italic mb-2">
                  « {t.quote} »
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium text-[#524970]">
                    {t.first_name}
                  </span>
                  <span className="text-[10px] text-grey">·</span>
                  <span className="text-[11px] text-grey">{t.job_title}</span>
                  {t.seniority_years != null && (
                    <>
                      <span className="text-[10px] text-grey">·</span>
                      <span className="text-[11px] text-grey">
                        {t.seniority_years} an{t.seniority_years > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  {t.quote_context && (
                    <span className="text-[9px] bg-[#F5F2FA] text-[#8B7FA8] px-2 py-0.5 rounded-full">
                      {t.quote_context}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 font-serif text-[28px] text-[#EDE9F5] leading-none -mt-1">
                "
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#B8AECF] font-light text-center mb-6">
        Citations authentiques de collaborateurs actuels
      </p>
    </>
  );
}
