import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, X, Globe } from "lucide-react";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateCompanyProfile } from "@/lib/companyProfile.functions";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

interface KeyFigure {
  label: string;
  value: string;
}
interface CompanyLink {
  label: string;
  url: string;
  type?: string | null;
}

interface OrgProfile {
  name: string;
  description: string;
  key_figures: KeyFigure[];
  values: string[];
  culture_note: string;
  links: CompanyLink[];
  source_urls: string[];
}

const empty: OrgProfile = {
  name: "",
  description: "",
  key_figures: [],
  values: [],
  culture_note: "",
  links: [],
  source_urls: [],
};

function SettingsPage() {
  const { organization } = useAuth();
  const [profile, setProfile] = useState<OrgProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const generate = useServerFn(generateCompanyProfile);

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select(
          "name, description, key_figures, values, culture_note, links, source_urls",
        )
        .eq("id", organization.id)
        .maybeSingle();
      if (data) {
        setProfile({
          name: data.name ?? "",
          description: data.description ?? "",
          key_figures: Array.isArray(data.key_figures)
            ? (data.key_figures as KeyFigure[])
            : [],
          values: Array.isArray(data.values) ? (data.values as string[]) : [],
          culture_note: data.culture_note ?? "",
          links: Array.isArray(data.links) ? (data.links as CompanyLink[]) : [],
          source_urls: Array.isArray(data.source_urls) ? data.source_urls : [],
        });
      }
      setLoading(false);
    })();
  }, [organization?.id]);

  async function save() {
    if (!organization?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: profile.name,
        description: profile.description || null,
        key_figures: profile.key_figures as any,
        values: profile.values,
        culture_note: profile.culture_note || null,
        links: profile.links as any,
        source_urls: profile.source_urls,
      })
      .eq("id", organization.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur d'enregistrement");
    } else {
      toast.success("Profil entreprise enregistré");
    }
  }

  async function runGenerate() {
    if (profile.source_urls.length === 0) {
      toast.error("Ajoutez au moins une URL");
      return;
    }
    setGenerating(true);
    try {
      const res = await generate({ data: { urls: profile.source_urls } });
      setProfile((p) => ({
        ...p,
        description: res.description || p.description,
        key_figures: res.key_figures.length ? res.key_figures : p.key_figures,
        values: res.values.length ? res.values : p.values,
        culture_note: res.culture_note || p.culture_note,
        links: res.links.length ? res.links : p.links,
      }));
      toast.success("Profil généré — pensez à enregistrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  }

  function addUrl() {
    const u = newUrl.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      toast.error("URL invalide");
      return;
    }
    if (profile.source_urls.includes(u)) return;
    setProfile((p) => ({ ...p, source_urls: [...p.source_urls, u] }));
    setNewUrl("");
  }

  if (loading) {
    return (
      <>
        <Topbar title="Paramètres" />
        <div className="px-7 py-12 flex items-center gap-2 text-grey">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Paramètres entreprise"
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl space-y-6">
        {/* AI sources */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-aubergine" style={{ fontSize: 20 }}>
              Liens sources
            </h2>
            <button
              onClick={runGenerate}
              disabled={generating || profile.source_urls.length === 0}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-aubergine text-lin disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              Générer avec l'IA
            </button>
          </div>
          <p className="text-[12px] text-grey mb-4">
            Ajoutez le site web, le LinkedIn, Welcome to the Jungle, des articles
            de presse… L'IA s'en sert pour rédiger automatiquement votre profil.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
              placeholder="https://votre-entreprise.com"
              className="flex-1 bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-lavande"
            />
            <button
              onClick={addUrl}
              className="px-3 py-2 rounded-lg bg-aubergine text-lin text-[12px] inline-flex items-center gap-1"
            >
              <Plus size={12} /> Ajouter
            </button>
          </div>
          {profile.source_urls.length > 0 && (
            <div className="space-y-1.5">
              {profile.source_urls.map((u) => (
                <div
                  key={u}
                  className="flex items-center justify-between gap-2 text-[12px] bg-[#FAF8F5] border-[0.5px] border-[rgba(45,38,64,0.08)] rounded-lg px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 text-aubergine truncate">
                    <Globe size={11} className="text-grey flex-shrink-0" />
                    <span className="truncate">{u}</span>
                  </span>
                  <button
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        source_urls: p.source_urls.filter((x) => x !== u),
                      }))
                    }
                    className="text-grey hover:text-aubergine flex-shrink-0"
                    aria-label="Supprimer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Identité */}
        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 20 }}>
            Identité
          </h2>
          <Field label="Nom de l'entreprise">
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </Card>

        {/* Présentation */}
        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 20 }}>
            Présentation & produit
          </h2>
          <textarea
            value={profile.description}
            onChange={(e) =>
              setProfile((p) => ({ ...p, description: e.target.value }))
            }
            rows={5}
            placeholder="Pitch, mission, produit, marché…"
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </Card>

        {/* Chiffres clés */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-aubergine" style={{ fontSize: 20 }}>
              Chiffres clés
            </h2>
            <button
              onClick={() =>
                setProfile((p) => ({
                  ...p,
                  key_figures: [...p.key_figures, { label: "", value: "" }],
                }))
              }
              className="text-[12px] inline-flex items-center gap-1 text-aubergine"
            >
              <Plus size={12} /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {profile.key_figures.map((kf, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={kf.label}
                  onChange={(e) =>
                    setProfile((p) => {
                      const next = [...p.key_figures];
                      next[i] = { ...next[i], label: e.target.value };
                      return { ...p, key_figures: next };
                    })
                  }
                  placeholder="Effectif"
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={kf.value}
                  onChange={(e) =>
                    setProfile((p) => {
                      const next = [...p.key_figures];
                      next[i] = { ...next[i], value: e.target.value };
                      return { ...p, key_figures: next };
                    })
                  }
                  placeholder="45 personnes"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      key_figures: p.key_figures.filter((_, j) => j !== i),
                    }))
                  }
                  className="px-2 text-grey hover:text-aubergine"
                  aria-label="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {profile.key_figures.length === 0 && (
              <p className="text-[12px] text-grey">Aucun chiffre clé renseigné.</p>
            )}
          </div>
        </Card>

        {/* Valeurs & culture */}
        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 20 }}>
            Valeurs & culture
          </h2>
          <Field label="Valeurs (séparées par une virgule)">
            <input
              value={profile.values.join(", ")}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  values: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="Bienveillance, Excellence, Transparence"
              className={inputCls}
            />
          </Field>
          <div className="mt-4">
            <Field label="Note culture / manifeste">
              <textarea
                value={profile.culture_note}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, culture_note: e.target.value }))
                }
                rows={3}
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </Field>
          </div>
        </Card>

        {/* Liens & médias */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-aubergine" style={{ fontSize: 20 }}>
              Liens & médias
            </h2>
            <button
              onClick={() =>
                setProfile((p) => ({
                  ...p,
                  links: [...p.links, { label: "", url: "", type: null }],
                }))
              }
              className="text-[12px] inline-flex items-center gap-1 text-aubergine"
            >
              <Plus size={12} /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {profile.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setProfile((p) => {
                      const next = [...p.links];
                      next[i] = { ...next[i], label: e.target.value };
                      return { ...p, links: next };
                    })
                  }
                  placeholder="LinkedIn"
                  className={`${inputCls} w-32`}
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setProfile((p) => {
                      const next = [...p.links];
                      next[i] = { ...next[i], url: e.target.value };
                      return { ...p, links: next };
                    })
                  }
                  placeholder="https://…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      links: p.links.filter((_, j) => j !== i),
                    }))
                  }
                  className="px-2 text-grey hover:text-aubergine"
                  aria-label="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {profile.links.length === 0 && (
              <p className="text-[12px] text-grey">Aucun lien renseigné.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

const inputCls =
  "w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-grey font-medium block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
