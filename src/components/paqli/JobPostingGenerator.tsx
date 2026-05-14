import { useState } from "react";
import { toast } from "sonner";
import { useJobPostingGenerator } from "@/hooks/useJobPostingGenerator";

export function JobPostingGenerator({
  packageId,
  packageTitle,
}: {
  packageId: string | null;
  packageTitle: string;
}) {
  const { posting, loading, error, generate } = useJobPostingGenerator();
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    if (!posting) return;
    try {
      await navigator.clipboard.writeText(posting);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  }

  function downloadTxt() {
    if (!posting) return;
    const blob = new Blob([posting], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-poste-${(packageTitle || "package")
      .toLowerCase()
      .replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!packageId) return null;

  return (
    <div className="border border-[rgba(45,38,64,0.08)] rounded-xl overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-[rgba(45,38,64,0.06)] flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-aubergine">
            Fiche de poste générée par l'IA
          </div>
          <div className="text-[11px] text-grey font-light mt-0.5">
            Prête à publier sur LinkedIn, Welcome to the Jungle ou votre site carrière
          </div>
        </div>
        {!posting && (
          <button
            onClick={() => generate(packageId)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-aubergine text-lin rounded-lg text-[12px] font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Génération…
              </>
            ) : (
              <>✨ Générer la fiche</>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 py-3 text-[12px] text-[#B85A6A] font-light">
          {error}
        </div>
      )}

      {posting && (
        <div className="p-5">
          <div className="prose prose-sm max-w-none text-aubergine-light leading-relaxed text-[13px]">
            {posting.split("\n").map((line, i) => {
              if (line.startsWith("## "))
                return (
                  <h2
                    key={i}
                    className="font-display text-[17px] text-aubergine mt-4 mb-2 first:mt-0"
                  >
                    {line.replace("## ", "")}
                  </h2>
                );
              if (line.startsWith("# "))
                return (
                  <h1
                    key={i}
                    className="font-display text-[20px] text-aubergine mb-2"
                  >
                    {line.replace("# ", "")}
                  </h1>
                );
              if (line.startsWith("- "))
                return (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <span className="text-[#8B7FA8] flex-shrink-0 mt-0.5">·</span>
                    <span>{line.replace("- ", "")}</span>
                  </div>
                );
              if (line === "") return <div key={i} className="h-2" />;
              return (
                <p key={i} className="mb-2 font-light">
                  {line}
                </p>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-[rgba(45,38,64,0.06)]">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(45,38,64,0.12)] rounded-lg text-[12px] text-aubergine-light font-medium"
            >
              {copied ? "✓ Copié !" : "📋 Copier"}
            </button>
            <button
              onClick={downloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(45,38,64,0.12)] rounded-lg text-[12px] text-aubergine-light"
            >
              ↓ Télécharger .txt
            </button>
            <button
              onClick={() => generate(packageId)}
              disabled={loading}
              className="flex items-center gap-1.5 text-[12px] text-[#8B7FA8] ml-auto disabled:opacity-40"
            >
              ↻ Régénérer
            </button>
          </div>

          <p className="text-[10px] text-[#B8AECF] font-light mt-3">
            Contenu généré par IA — relisez et adaptez avant publication.
            Ne mentionnez pas Paqli dans votre fiche de poste publiée.
          </p>
        </div>
      )}
    </div>
  );
}
