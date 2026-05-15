import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  Globe,
  Building2,
  Users as UsersIcon,
  Target,
  Trash2,
  CheckCircle2,
  CreditCard,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateCompanyProfile } from "@/lib/companyProfile.functions";
import { getLinkQuotaFn } from "@/lib/linkQuota.functions";
import {
  generatePackageBenchmarkFn,
  getPackageBenchmarkFn,
  type BenchmarkContent,
} from "@/lib/competitorBenchmark.functions";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as TabKey | undefined) ?? undefined,
  }),
});

type TabKey = "company" | "users" | "benchmark" | "plan";

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "Mon entreprise", icon: Building2 },
  { key: "users", label: "Utilisateurs", icon: UsersIcon },
  { key: "benchmark", label: "Benchmark", icon: Target },
  { key: "plan", label: "Plan", icon: CreditCard },
];

function SettingsPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabKey>(search.tab ?? "company");
  useEffect(() => {
    if (search.tab) setTab(search.tab);
  }, [search.tab]);

  return (
    <>
      <Topbar title="Paramètres" />
      <div className="px-4 sm:px-7 pt-4 sm:pt-6">
        <div className="flex gap-1 border-b border-[rgba(45,38,64,0.12)] max-w-3xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-aubergine text-aubergine"
                    : "border-transparent text-grey hover:text-aubergine"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "company" && <CompanyTab />}
      {tab === "users" && <UsersTab />}
      {tab === "benchmark" && <BenchmarkTab />}
      {tab === "plan" && <PlanTab />}
    </>
  );
}

/* ============================================================
 *  TAB 1 — Mon entreprise
 * ============================================================ */

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
  siret: string;
  address_street: string;
  address_zip: string;
  address_city: string;
  profile_generated_at: string | null;
}

const empty: OrgProfile = {
  name: "",
  description: "",
  key_figures: [],
  values: [],
  culture_note: "",
  links: [],
  source_urls: [],
  siret: "",
  address_street: "",
  address_zip: "",
  address_city: "",
  profile_generated_at: null,
};

function CompanyTab() {
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
          "name, description, key_figures, values, culture_note, links, source_urls, siret, address_street, address_zip, address_city, profile_generated_at",
        )
        .eq("id", organization.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setProfile({
          name: d.name ?? "",
          description: d.description ?? "",
          key_figures: Array.isArray(d.key_figures) ? d.key_figures : [],
          values: Array.isArray(d.values) ? d.values : [],
          culture_note: d.culture_note ?? "",
          links: Array.isArray(d.links) ? d.links : [],
          source_urls: Array.isArray(d.source_urls) ? d.source_urls : [],
          siret: d.siret ?? "",
          address_street: d.address_street ?? "",
          address_zip: d.address_zip ?? "",
          address_city: d.address_city ?? "",
          profile_generated_at: d.profile_generated_at ?? null,
        });
      }
      setLoading(false);
    })();
  }, [organization?.id]);

  async function save() {
    if (!organization?.id) return;
    if (profile.siret && profile.siret.length !== 14) {
      toast.error("Le SIRET doit contenir 14 chiffres");
      return;
    }
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
        siret: profile.siret || null,
        address_street: profile.address_street || null,
        address_zip: profile.address_zip || null,
        address_city: profile.address_city || null,
      })
      .eq("id", organization.id);
    setSaving(false);
    if (error) toast.error("Erreur d'enregistrement");
    else toast.success("Profil entreprise enregistré");
  }

  async function runGenerate() {
    if (profile.profile_generated_at) {
      toast.info("Profil déjà généré une fois — édition manuelle uniquement");
      return;
    }
    if (profile.source_urls.length === 0) {
      toast.error("Ajoutez au moins une URL");
      return;
    }
    setGenerating(true);
    try {
      const res = await generate({ data: { urls: profile.source_urls } });
      const generatedAt = new Date().toISOString();
      setProfile((p) => ({
        ...p,
        description: res.description || p.description,
        key_figures: res.key_figures.length ? res.key_figures : p.key_figures,
        values: res.values.length ? res.values : p.values,
        culture_note: res.culture_note || p.culture_note,
        links: res.links.length ? res.links : p.links,
        profile_generated_at: generatedAt,
      }));
      if (organization?.id) {
        await supabase
          .from("organizations")
          .update({ profile_generated_at: generatedAt } as any)
          .eq("id", organization.id);
      }
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
      <div className="px-7 py-12 flex items-center gap-2 text-grey">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  const aiUsed = !!profile.profile_generated_at;

  return (
    <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl space-y-6">
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-aubergine" style={{ fontSize: 20 }}>
            Liens sources
          </h2>
          <button
            onClick={runGenerate}
            disabled={generating || profile.source_urls.length === 0 || aiUsed}
            title={
              aiUsed
                ? "Profil déjà généré — modifications manuelles uniquement"
                : "Générer le profil avec l'IA"
            }
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-aubergine text-lin disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : aiUsed ? (
              <CheckCircle2 size={12} />
            ) : (
              <Sparkles size={12} />
            )}
            {aiUsed ? "Déjà généré" : "Générer avec l'IA"}
          </button>
        </div>
        <p className="text-[12px] text-grey mb-4">
          {aiUsed
            ? "Le profil a déjà été généré par l'IA. Modifiez les champs ci-dessous manuellement."
            : "Ajoutez le site web, le LinkedIn, Welcome to the Jungle, des articles de presse… L'IA s'en sert pour rédiger automatiquement votre profil. Génération unique."}
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
        <div className="mt-4">
          <Field label="SIRET (requis pour la promesse d'embauche)">
            <input
              value={profile.siret}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  siret: e.target.value.replace(/\s/g, ""),
                }))
              }
              placeholder="12345678900012"
              maxLength={14}
              className={inputCls}
            />
            {profile.siret && profile.siret.length !== 14 && (
              <p className="text-[11px] text-danger mt-1">
                Le SIRET doit contenir 14 chiffres
              </p>
            )}
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Adresse du siège social (rue)">
            <input
              value={profile.address_street}
              onChange={(e) =>
                setProfile((p) => ({ ...p, address_street: e.target.value }))
              }
              placeholder="42 Avenue des Champs-Élysées"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-[120px_1fr] gap-3">
          <Field label="Code postal">
            <input
              value={profile.address_zip}
              onChange={(e) =>
                setProfile((p) => ({ ...p, address_zip: e.target.value }))
              }
              placeholder="75008"
              maxLength={5}
              className={inputCls}
            />
          </Field>
          <Field label="Ville">
            <input
              value={profile.address_city}
              onChange={(e) =>
                setProfile((p) => ({ ...p, address_city: e.target.value }))
              }
              placeholder="Paris"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 20 }}>
          Présentation & produit
        </h2>
        <textarea
          value={profile.description}
          onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
          rows={5}
          placeholder="Pitch, mission, produit, marché…"
          className={`${inputCls} resize-none leading-relaxed`}
        />
      </Card>

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
  );
}

/* ============================================================
 *  TAB 2 — Utilisateurs (rôles)
 * ============================================================ */

type AppRole = "admin" | "member" | "manager" | "validator";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  manager: "Manager (créateur de packages)",
  validator: "Validateur de packages",
  member: "Membre",
};

const ROLE_DESC: Record<AppRole, string> = {
  admin: "Accès complet, gestion des utilisateurs et paramètres.",
  manager: "Peut créer et soumettre des packages à validation.",
  validator: "Peut valider les packages avant envoi au candidat.",
  member: "Accès en lecture aux packages de l'organisation.",
};

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  roles: AppRole[];
}

function UsersTab() {
  const { organization, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!organization?.id || !user?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organization.id),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("organization_id", organization.id),
      ]);
      const rolesByUser = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });
      const list: Member[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roles: rolesByUser.get(p.id) ?? [],
      }));
      setMembers(list);
      setIsAdmin((rolesByUser.get(user.id) ?? []).includes("admin"));
      setLoading(false);
    })();
  }, [organization?.id, user?.id]);

  async function toggleRole(memberId: string, role: AppRole, currentlyHas: boolean) {
    if (!organization?.id) return;
    if (!isAdmin) {
      toast.error("Réservé aux administrateurs");
      return;
    }
    if (currentlyHas) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", memberId)
        .eq("organization_id", organization.id)
        .eq("role", role);
      if (error) return toast.error("Erreur");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: memberId,
          organization_id: organization.id,
          role: role as any,
        });
      if (error) return toast.error("Erreur");
    }
    setMembers((ms) =>
      ms.map((m) =>
        m.id === memberId
          ? {
              ...m,
              roles: currentlyHas
                ? m.roles.filter((r) => r !== role)
                : [...m.roles, role],
            }
          : m,
      ),
    );
  }

  if (loading) {
    return (
      <div className="px-7 py-12 flex items-center gap-2 text-grey">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl space-y-6">
      <Card>
        <h2 className="font-display text-aubergine mb-2" style={{ fontSize: 20 }}>
          Utilisateurs & rôles
        </h2>
        <p className="text-[12px] text-grey mb-4">
          Attribuez un ou plusieurs rôles à chaque membre. Les rôles définissent
          qui peut créer ou valider les packages.
        </p>

        {!isAdmin && (
          <div className="mb-4 p-3 rounded-lg bg-[#FAF8F5] border-[0.5px] border-[rgba(45,38,64,0.08)] text-[12px] text-grey">
            Vous devez être administrateur pour modifier les rôles.
          </div>
        )}

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="border-[0.5px] border-[rgba(45,38,64,0.08)] rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-[13px] text-aubergine font-medium truncate">
                    {m.full_name?.trim() || m.email.split("@")[0]}
                    {m.id === user?.id && (
                      <span className="ml-2 text-[10px] text-grey">(vous)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-grey truncate">{m.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => {
                  const has = m.roles.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRole(m.id, r, has)}
                      disabled={!isAdmin}
                      title={ROLE_DESC[r]}
                      className={`text-[11px] px-2.5 py-1 rounded-full border-[0.5px] transition-colors ${
                        has
                          ? "bg-aubergine text-lin border-aubergine"
                          : "bg-white text-grey border-[rgba(45,38,64,0.15)] hover:border-aubergine"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-[12px] text-grey">Aucun membre.</p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-aubergine mb-3" style={{ fontSize: 16 }}>
          Définition des rôles
        </h3>
        <ul className="space-y-2 text-[12px] text-aubergine-light">
          {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
            <li key={r}>
              <span className="font-medium text-aubergine">{ROLE_LABELS[r]}</span>{" "}
              — {ROLE_DESC[r]}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ============================================================
 *  TAB 3 — Benchmark concurrentiel
 * ============================================================ */

interface Competitor {
  id: string;
  name: string;
  website: string | null;
  notes: string | null;
  salary_min: number | null;
  salary_max: number | null;
  strengths: string[];
  weaknesses: string[];
}

function BenchmarkTab() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Competitor[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", website: "" });

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("competitors")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Competitor[]);
      setLoading(false);
    })();
  }, [organization?.id]);

  async function add() {
    if (!organization?.id || !draft.name.trim()) return;
    setCreating(true);
    const { data, error } = await (supabase as any)
      .from("competitors")
      .insert({
        organization_id: organization.id,
        name: draft.name.trim(),
        website: draft.website.trim() || null,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error("Erreur — réservé aux administrateurs");
      return;
    }
    setItems((p) => [data as Competitor, ...p]);
    setDraft({ name: "", website: "" });
    toast.success("Concurrent ajouté");
  }

  async function update(id: string, patch: Partial<Competitor>) {
    setItems((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function persist(c: Competitor) {
    const { error } = await (supabase as any)
      .from("competitors")
      .update({
        name: c.name,
        website: c.website,
        notes: c.notes,
        salary_min: c.salary_min,
        salary_max: c.salary_max,
        strengths: c.strengths,
        weaknesses: c.weaknesses,
      })
      .eq("id", c.id);
    if (error) toast.error("Erreur d'enregistrement");
    else toast.success("Enregistré");
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce concurrent ?")) return;
    const { error } = await (supabase as any).from("competitors").delete().eq("id", id);
    if (error) return toast.error("Erreur");
    setItems((p) => p.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="px-7 py-12 flex items-center gap-2 text-grey">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl space-y-6">
      <Card>
        <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
          Concurrents & positionnement
        </h2>
        <p className="text-[12px] text-grey mb-4">
          Suivez les entreprises qui chassent les mêmes profils que vous, leur
          fourchette salariale et vos avantages comparés.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Nom du concurrent"
            className={`${inputCls} sm:flex-1`}
          />
          <input
            value={draft.website}
            onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
            placeholder="https://…"
            className={`${inputCls} sm:flex-1`}
          />
          <button
            onClick={add}
            disabled={creating || !draft.name.trim()}
            className="px-3 py-2 rounded-lg bg-aubergine text-lin text-[12px] inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>

        <div className="space-y-3">
          {items.map((c) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onChange={(patch) => update(c.id, patch)}
              onSave={() => persist(c)}
              onRemove={() => remove(c.id)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-[12px] text-grey">
              Aucun concurrent ajouté. Commencez par en ajouter un ci-dessus.
            </p>
          )}
        </div>
      </Card>

      <BenchmarkGenerator competitorCount={items.length} />
    </div>
  );
}

/* ============================================================
 *  Benchmark Generator (AI)
 * ============================================================ */

function BenchmarkGenerator({ competitorCount }: { competitorCount: number }) {
  const { organization } = useAuth();
  const [packages, setPackages] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<BenchmarkContent | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generateFn = useServerFn(generatePackageBenchmarkFn);
  const getFn = useServerFn(getPackageBenchmarkFn);

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, title")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false });
      const list = (data ?? []) as { id: string; title: string }[];
      setPackages(list);
      if (list[0]) setSelectedId(list[0].id);
    })();
  }, [organization?.id]);

  useEffect(() => {
    if (!selectedId) {
      setContent(null);
      setGeneratedAt(null);
      return;
    }
    setLoading(true);
    getFn({ data: { packageId: selectedId } })
      .then((res) => {
        if (res.exists) {
          setContent(res.content);
          setGeneratedAt(res.generated_at);
        } else {
          setContent(null);
          setGeneratedAt(null);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedId, getFn]);

  async function generate() {
    if (!selectedId) return;
    if (competitorCount === 0) {
      toast.error("Ajoute au moins un concurrent ci-dessus.");
      return;
    }
    setGenerating(true);
    try {
      const res = await generateFn({ data: { packageId: selectedId } });
      setContent(res.content);
      setGeneratedAt(res.generated_at);
      toast.success("Benchmark généré");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
            Benchmark IA
          </h2>
          <p className="text-[12px] text-grey">
            Analyse comparative générée par IA, visible côté candidat dans
            l'onglet « Comparatif ».
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={`${inputCls} sm:flex-1`}
        >
          <option value="">— Sélectionner un package —</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={generating || !selectedId || competitorCount === 0}
          className="px-3 py-2 rounded-lg bg-aubergine text-lin text-[12px] inline-flex items-center justify-center gap-1 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {content ? "Régénérer" : "Générer"}
        </button>
      </div>

      {loading && (
        <div className="text-[12px] text-grey flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Chargement…
        </div>
      )}

      {!loading && !content && selectedId && (
        <p className="text-[12px] text-grey">
          Aucun benchmark pour ce package. Lance une génération.
        </p>
      )}

      {content && (
        <BenchmarkPreview content={content} generatedAt={generatedAt} />
      )}
    </Card>
  );
}

function BenchmarkPreview({
  content,
  generatedAt,
}: {
  content: BenchmarkContent;
  generatedAt: string | null;
}) {
  const companies = content.criteria[0]?.scores.map((s) => s.company) ?? [];
  return (
    <div className="space-y-4">
      <div className="rounded-lg p-3" style={{ background: "#FAF8F5" }}>
        <div className="text-[11px] uppercase tracking-wider text-grey mb-1">
          Synthèse
        </div>
        <p className="text-[12px] text-aubergine leading-relaxed whitespace-pre-line">
          {content.synthesis}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-grey border-b border-[rgba(45,38,64,0.08)]">
              <th className="py-2 pr-2 font-medium">Critère</th>
              <th className="py-2 px-1 font-medium text-center w-10">%</th>
              {companies.map((co) => (
                <th key={co} className="py-2 px-2 font-medium text-center">
                  {co}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.criteria.map((cr, i) => (
              <tr key={i} className="border-b border-[rgba(45,38,64,0.04)]">
                <td className="py-2 pr-2 text-aubergine font-medium">
                  {cr.name}
                </td>
                <td className="py-2 px-1 text-center text-grey tabular-nums">
                  {Math.round(cr.weight * 100)}
                </td>
                {companies.map((co) => {
                  const s = cr.scores.find((x) => x.company === co);
                  return (
                    <td
                      key={co}
                      className="py-2 px-2 text-center tabular-nums"
                      title={s?.note}
                    >
                      {s?.score ?? "—"}/5
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {generatedAt && (
        <p className="text-[10px] text-grey">
          Généré le{" "}
          {new Date(generatedAt).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

function CompetitorCard({
  competitor,
  onChange,
  onSave,
  onRemove,
}: {
  competitor: Competitor;
  onChange: (patch: Partial<Competitor>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const strengths = useMemo(() => competitor.strengths.join(", "), [competitor.strengths]);
  const weaknesses = useMemo(
    () => competitor.weaknesses.join(", "),
    [competitor.weaknesses],
  );

  return (
    <div className="border-[0.5px] border-[rgba(45,38,64,0.1)] rounded-lg p-3 bg-[#FAF8F5]">
      <div className="flex items-start gap-2 mb-3">
        <input
          value={competitor.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`${inputCls} flex-1 font-medium`}
        />
        <button
          onClick={onRemove}
          className="p-2 text-grey hover:text-danger"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Site web">
          <input
            value={competitor.website ?? ""}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Salaire min (k€)">
            <input
              type="number"
              value={competitor.salary_min ?? ""}
              onChange={(e) =>
                onChange({
                  salary_min: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Salaire max (k€)">
            <input
              type="number"
              value={competitor.salary_max ?? ""}
              onChange={(e) =>
                onChange({
                  salary_max: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <div className="mt-3">
        <Field label="Leurs forces (séparées par une virgule)">
          <input
            value={strengths}
            onChange={(e) =>
              onChange({
                strengths: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Marque forte, Equity généreuse"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Leurs faiblesses (séparées par une virgule)">
          <input
            value={weaknesses}
            onChange={(e) =>
              onChange({
                weaknesses: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Peu de remote, Process long"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <textarea
            value={competitor.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={onSave}>Enregistrer</Button>
      </div>
    </div>
  );
}

/* ============================================================
 *  Shared
 * ============================================================ */

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

/* ============================================================================
 *  TAB 4 — Plan & facturation
 * ========================================================================== */

const PLANS: {
  key: string;
  label: string;
  quota: number | null;
  price: string;
  highlights: string[];
}[] = [
  {
    key: "starter",
    label: "Starter",
    quota: 10,
    price: "Gratuit",
    highlights: ["10 liens / mois", "1 utilisateur", "Support email"],
  },
  {
    key: "pro",
    label: "Pro",
    quota: 50,
    price: "49€ / mois",
    highlights: ["50 liens / mois", "Utilisateurs illimités", "Benchmark IA"],
  },
  {
    key: "business",
    label: "Business",
    quota: 200,
    price: "149€ / mois",
    highlights: ["200 liens / mois", "Rôles & validation", "Support prioritaire"],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    quota: null,
    price: "Sur devis",
    highlights: ["Liens illimités", "SSO", "Account manager dédié"],
  },
];

function PlanTab() {
  const fetchQuota = useServerFn(getLinkQuotaFn);
  const [data, setData] = useState<{ used: number; quota: number | null; plan: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuota()
      .then(setData)
      .finally(() => setLoading(false));
  }, [fetchQuota]);

  const currentPlanKey = data?.plan ?? "starter";
  const current = PLANS.find((p) => p.key === currentPlanKey) ?? PLANS[0];
  const used = data?.used ?? 0;
  const quota = data?.quota ?? current.quota;
  const remaining = quota == null ? null : Math.max(0, quota - used);
  const pct = quota == null || quota === 0 ? 0 : Math.min(100, Math.round((used / quota) * 100));
  const danger = quota != null && remaining! <= Math.max(2, Math.round(quota * 0.1));

  const currentIdx = PLANS.findIndex((p) => p.key === currentPlanKey);
  const nextPlan = currentIdx >= 0 && currentIdx < PLANS.length - 1 ? PLANS[currentIdx + 1] : null;

  return (
    <div className="px-4 sm:px-7 py-6 max-w-3xl space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 text-grey text-sm">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <Card>
            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-grey font-medium">
                    Plan actuel
                  </div>
                  <div className="font-display text-aubergine mt-1" style={{ fontSize: 28 }}>
                    {current.label}
                  </div>
                  <div className="text-sm text-grey mt-0.5">{current.price}</div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={{ background: "#F0EBE8", color: "#2D2640" }}
                >
                  {quota == null ? "Liens illimités" : `${quota} liens / mois`}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-aubergine font-medium">
                    {used}
                    {quota != null && <span className="text-grey"> / {quota}</span>} liens utilisés ce mois
                  </div>
                  {quota != null && (
                    <div className={`text-[12px] font-medium ${danger ? "text-[#B23A1F]" : "text-grey"}`}>
                      {remaining} restant{(remaining ?? 0) > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                {quota != null && (
                  <div className="h-2 rounded-full bg-[#F0EBE8] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: danger ? "#B23A1F" : "#2D2640",
                      }}
                    />
                  </div>
                )}
                <div className="text-[11px] text-grey">
                  Le compteur se réinitialise le 1er de chaque mois.
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#F0EBE8" }}
                  >
                    <Plus size={14} className="text-aubergine" />
                  </div>
                  <div className="font-display text-aubergine" style={{ fontSize: 16 }}>
                    Pack de 5 liens
                  </div>
                </div>
                <p className="text-[13px] text-grey leading-relaxed">
                  Besoin de quelques liens en plus ce mois-ci ? Ajoutez 5 liens valables jusqu'à la fin du mois.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="font-display text-aubergine" style={{ fontSize: 20 }}>
                    19€
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      toast.info("Paiement bientôt disponible — contactez-nous pour ajouter un pack.")
                    }
                  >
                    Acheter
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#2D2640" }}
                  >
                    <Zap size={14} className="text-white" />
                  </div>
                  <div className="font-display text-aubergine" style={{ fontSize: 16 }}>
                    {nextPlan ? `Passer au plan ${nextPlan.label}` : "Plan maximum atteint"}
                  </div>
                </div>
                <p className="text-[13px] text-grey leading-relaxed">
                  {nextPlan
                    ? `${nextPlan.quota == null ? "Liens illimités" : `${nextPlan.quota} liens / mois`} et plus de fonctionnalités.`
                    : "Vous bénéficiez déjà du plan le plus complet."}
                </p>
                {nextPlan && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="font-display text-aubergine" style={{ fontSize: 20 }}>
                      {nextPlan.price}
                    </div>
                    <Button
                      onClick={() =>
                        toast.info("Mise à niveau bientôt disponible — contactez-nous.")
                      }
                    >
                      Passer au {nextPlan.label}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-5">
              <div className="font-display text-aubergine mb-4" style={{ fontSize: 18 }}>
                Tous les plans
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLANS.map((p) => {
                  const isCurrent = p.key === currentPlanKey;
                  return (
                    <div
                      key={p.key}
                      className={`rounded-[10px] p-4 border transition-colors ${
                        isCurrent
                          ? "border-aubergine bg-[#FAF8F5]"
                          : "border-[rgba(45,38,64,0.12)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-display text-aubergine" style={{ fontSize: 16 }}>
                          {p.label}
                        </div>
                        {isCurrent && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
                            style={{ background: "#2D2640", color: "white" }}
                          >
                            Actuel
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-grey mt-1">{p.price}</div>
                      <ul className="mt-3 space-y-1.5">
                        {p.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-1.5 text-[12px] text-aubergine">
                            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-[#639922]" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
