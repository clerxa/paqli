import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import {
  importJobPostingFn,
  type ImportedJobData,
  type ImportErrorAlternative,
} from "@/lib/importJob.functions";

type Method = "url" | "text" | "file";

interface Props {
  onImported: (data: ImportedJobData) => void;
  onClose: () => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImportJobModal({ onImported, onClose }: Props) {
  const importFn = useServerFn(importJobPostingFn);
  const [method, setMethod] = useState<Method | null>(null);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedJobData | null>(null);

  function validateAndSetFile(f: File) {
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setError("Format non supporté. Utilisez PDF, Word (.docx) ou TXT.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Fichier trop volumineux. Maximum 5 Mo.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function run(payload: { url?: string; text?: string; file?: File }) {
    setLoading(true);
    setError(null);
    try {
      let body: { url?: string; text?: string; file?: { name: string; type: string; base64: string } };
      if (payload.file) {
        const base64 = await fileToBase64(payload.file);
        body = { file: { name: payload.file.name, type: payload.file.type, base64 } };
      } else if (payload.url) {
        body = { url: payload.url };
      } else {
        body = { text: payload.text };
      }
      const res = await importFn({ data: body });
      setPreview(res.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Erreur inattendue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-lin rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[rgba(45,38,64,0.06)]">
          <div>
            <div className="text-[18px] font-display text-aubergine">
              Importer une annonce
            </div>
            <div className="text-[12px] text-grey font-light mt-1">
              Paqli extrait automatiquement les informations
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-grey hover:text-aubergine"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 border-[3px] border-[#8B7FA8] border-t-transparent rounded-full animate-spin" />
              <div className="text-[13px] text-grey font-light">
                Claude analyse votre annonce…
              </div>
              <div className="text-[11px] text-[#B8AECF] font-light">
                ~10 à 20 secondes
              </div>
            </div>
          )}

          {/* Preview */}
          {!loading && preview && (
            <ImportPreview
              data={preview}
              onConfirm={() => {
                onImported(preview);
                onClose();
              }}
              onRetry={() => {
                setPreview(null);
                setMethod(null);
                setInput("");
                setFile(null);
              }}
            />
          )}

          {/* Method selection */}
          {!loading && !preview && !method && (
            <div className="space-y-3">
              <div className="text-[13px] text-aubergine font-medium mb-2">
                Comment souhaitez-vous importer votre annonce ?
              </div>
              {[
                {
                  id: "url" as const,
                  icon: "🔗",
                  title: "Depuis une URL",
                  desc: "Collez le lien — WTJ, APEC, votre site carrière…",
                },
                {
                  id: "text" as const,
                  icon: "📝",
                  title: "Depuis le texte",
                  desc: "Copiez-collez le contenu de votre fiche de poste.",
                },
                {
                  id: "file" as const,
                  icon: "📄",
                  title: "Depuis un fichier",
                  desc: "Uploadez un PDF, Word (.docx) ou TXT.",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className="w-full flex items-start gap-4 p-4 border border-[rgba(45,38,64,0.1)] rounded-xl text-left hover:border-[rgba(139,127,168,0.3)] hover:bg-[#F5F2FA] transition-all"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <div className="text-[13px] font-medium text-aubergine">
                      {m.title}
                    </div>
                    <div className="text-[11px] text-grey font-light mt-0.5">
                      {m.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* URL */}
          {!loading && !preview && method === "url" && (
            <div>
              <button
                onClick={() => setMethod(null)}
                className="text-[11px] text-grey mb-4 hover:text-aubergine"
              >
                ← Retour
              </button>
              <div className="text-[13px] font-medium text-aubergine mb-2">
                URL de votre annonce
              </div>
              <input
                type="url"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://www.welcometothejungle.com/fr/companies/…"
                className="w-full h-10 px-3 border border-[rgba(45,38,64,0.15)] rounded-lg text-[13px] text-aubergine outline-none focus:border-[#8B7FA8] mb-3"
                autoFocus
              />
              <div className="text-[11px] text-grey font-light mb-4">
                L'annonce doit être publiquement accessible. LinkedIn et Indeed
                requièrent souvent une connexion — préférez « Coller le texte »
                pour ces plateformes.
              </div>
              {error && (
                <div className="text-[11px] text-danger mb-3">{error}</div>
              )}
              <button
                onClick={() => run({ url: input.trim() })}
                disabled={!input.trim() || loading}
                className="w-full py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium disabled:opacity-40"
              >
                Analyser l'annonce →
              </button>
            </div>
          )}

          {/* Text */}
          {!loading && !preview && method === "text" && (
            <div>
              <button
                onClick={() => setMethod(null)}
                className="text-[11px] text-grey mb-4 hover:text-aubergine"
              >
                ← Retour
              </button>
              <div className="text-[13px] font-medium text-aubergine mb-2">
                Collez votre annonce
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  "Senior Engineer Backend — CDI · Paris 9e · Hybride 3j\n\nMissions :\n- ..."
                }
                className="w-full border border-[rgba(45,38,64,0.15)] rounded-lg p-3 text-[12px] text-aubergine resize-none h-52 outline-none focus:border-[#8B7FA8] mb-3 leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-[#B8AECF]">
                  {input.length} caractères
                </span>
                <span className="text-[10px] text-grey">
                  Min. 100 caractères recommandés
                </span>
              </div>
              {error && (
                <div className="text-[11px] text-danger mb-3">{error}</div>
              )}
              <button
                onClick={() => run({ text: input.trim() })}
                disabled={input.trim().length < 50 || loading}
                className="w-full py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium disabled:opacity-40"
              >
                Analyser le texte →
              </button>
            </div>
          )}

          {/* File */}
          {!loading && !preview && method === "file" && (
            <div>
              <button
                onClick={() => {
                  setMethod(null);
                  setFile(null);
                  setError(null);
                }}
                className="text-[11px] text-grey mb-4 hover:text-aubergine"
              >
                ← Retour
              </button>
              <div className="text-[13px] font-medium text-aubergine mb-2">
                Uploadez votre fiche de poste
              </div>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4 ${
                  file
                    ? "border-[#3B6D11] bg-[#EAF3DE]"
                    : "border-[rgba(45,38,64,0.15)] hover:border-[#8B7FA8]"
                }`}
                onClick={() =>
                  document.getElementById("paqli-file-input")?.click()
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) validateAndSetFile(dropped);
                }}
              >
                <input
                  id="paqli-file-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndSetFile(f);
                  }}
                />
                {file ? (
                  <div>
                    <div className="text-2xl mb-2">
                      {file.name.toLowerCase().endsWith(".pdf") ? "📄" : "📝"}
                    </div>
                    <div className="text-[13px] font-medium text-[#3B6D11]">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-[#3B6D11] font-light mt-1">
                      {(file.size / 1024).toFixed(0)} Ko · Prêt à analyser
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-3">📎</div>
                    <div className="text-[13px] font-medium text-aubergine mb-1">
                      Glissez votre fichier ici
                    </div>
                    <div className="text-[11px] text-grey font-light">
                      ou cliquez pour choisir · PDF, Word (.docx), TXT · Max 5 Mo
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <div className="text-[11px] text-danger mb-3">{error}</div>
              )}
              <button
                onClick={() => file && run({ file })}
                disabled={!file || loading}
                className="w-full py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium disabled:opacity-40"
              >
                Analyser le fichier →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportPreview({
  data,
  onConfirm,
  onRetry,
}: {
  data: ImportedJobData;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const conf =
    data.confidence?.overall === "high"
      ? { color: "#27500A", bg: "#EAF3DE", label: "Extraction fiable", icon: "✅" }
      : data.confidence?.overall === "low"
        ? { color: "#A32D2D", bg: "#FCEBEB", label: "Extraction partielle", icon: "⚠️" }
        : { color: "#633806", bg: "#FAEEDA", label: "Vérifiez les informations", icon: "💡" };

  return (
    <div>
      <div
        className="flex items-start gap-3 p-3 rounded-lg mb-4"
        style={{ background: conf.bg }}
      >
        <span className="text-lg leading-none">{conf.icon}</span>
        <div>
          <div
            className="text-[12px] font-medium"
            style={{ color: conf.color }}
          >
            {conf.label}
          </div>
          {data.confidence?.notes && (
            <div
              className="text-[11px] font-light mt-0.5"
              style={{ color: conf.color }}
            >
              {data.confidence.notes}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Row label="Poste" value={data.title ?? "Non détecté"} />
        {(data.contract_type || data.location_city || data.remote_policy) && (
          <div>
            <div className="text-[10px] uppercase text-grey mb-1">Infos</div>
            <div className="flex flex-wrap gap-1.5">
              {data.contract_type && (
                <Chip>{data.contract_type.toUpperCase()}</Chip>
              )}
              {data.location_city && <Chip>📍 {data.location_city}</Chip>}
              {data.remote_policy && (
                <Chip>
                  {data.remote_policy === "full_remote"
                    ? "🏠 Full remote"
                    : data.remote_policy === "hybrid"
                      ? "🔀 Hybride"
                      : "🏢 Présentiel"}
                </Chip>
              )}
            </div>
          </div>
        )}
        {data.missions?.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-grey mb-1">Missions</div>
            <ul className="text-[12px] text-aubergine space-y-0.5">
              {data.missions.slice(0, 4).map((m, i) => (
                <li key={i}>· {m}</li>
              ))}
              {data.missions.length > 4 && (
                <li className="text-grey">
                  + {data.missions.length - 4} autres missions
                </li>
              )}
            </ul>
          </div>
        )}
        {data.stack?.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-grey mb-1">Stack</div>
            <div className="flex flex-wrap gap-1.5">
              {data.stack.map((t, i) => (
                <Chip key={i}>{t}</Chip>
              ))}
            </div>
          </div>
        )}
        {(data.gross_salary_min || data.gross_salary_max) && (
          <div>
            <div className="text-[10px] uppercase text-grey mb-1">Salaire</div>
            <div className="text-[13px] text-aubergine">
              {data.gross_salary_min && data.gross_salary_max
                ? `${data.gross_salary_min.toLocaleString("fr-FR")} – ${data.gross_salary_max.toLocaleString("fr-FR")} €`
                : data.gross_salary_min
                  ? `À partir de ${data.gross_salary_min.toLocaleString("fr-FR")} €`
                  : `Jusqu'à ${data.gross_salary_max!.toLocaleString("fr-FR")} €`}{" "}
              <span className="text-[11px] text-grey">(brut annuel)</span>
            </div>
          </div>
        )}
        {data.process_steps?.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-grey mb-1">Process</div>
            <div className="text-[12px] text-aubergine">
              {data.process_steps.length} étape
              {data.process_steps.length > 1 ? "s" : ""} détectée
              {data.process_steps.length > 1 ? "s" : ""}
              {data.process_duration ? ` · ${data.process_duration}` : ""}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 p-3 bg-[#F5F2FA] rounded-lg">
        <div className="text-[11px] text-aubergine-light font-light leading-relaxed">
          ✨ Ces informations pré-rempliront le configurateur. Vous pourrez les
          modifier, compléter et enrichir à chaque étape. L'extraction n'est
          pas parfaite — vérifiez les données avant de publier.
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-5">
        <button
          onClick={onRetry}
          className="text-[12px] text-grey hover:text-aubergine"
        >
          ← Recommencer
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2.5 bg-aubergine text-lin rounded-lg text-[13px] font-medium"
        >
          Utiliser ces informations →
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-grey mb-1">{label}</div>
      <div className="text-[13px] text-aubergine">{value}</div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brume text-[11px] text-aubergine">
      {children}
    </span>
  );
}
