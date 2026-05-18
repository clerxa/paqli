import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeTestimonial {
  id: string;
  first_name: string;
  job_title: string;
  seniority_years: number | null;
  quote: string;
  quote_context: string | null;
  avatar_url: string | null;
  display_order: number;
  is_active: boolean;
}

const QUOTE_MAX = 280;
const MAX_TESTIMONIALS = 5;

export function TestimonialsSection({
  organizationId,
  onCountChange,
}: {
  organizationId: string;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<EmployeeTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("employee_testimonials" as any)
      .select("*")
      .eq("organization_id", organizationId)
      .order("display_order");
    const list = (data ?? []) as EmployeeTestimonial[];
    setItems(list);
    setLoading(false);
    onCountChange?.(list.length);
  }

  useEffect(() => {
    if (organizationId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function toggleActive(id: string, current: boolean) {
    await supabase
      .from("employee_testimonials" as any)
      .update({ is_active: !current })
      .eq("id", id);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette citation ?")) return;
    await supabase.from("employee_testimonials" as any).delete().eq("id", id);
    toast.success("Citation supprimée");
    await load();
  }

  async function reorder(id: string, direction: "up" | "down") {
    const idx = items.findIndex((t) => t.id === id);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= items.length) return;
    const updated = [...items];
    const [it] = updated.splice(idx, 1);
    updated.splice(swap, 0, it);
    await Promise.all(
      updated.map((t, i) =>
        supabase
          .from("employee_testimonials" as any)
          .update({ display_order: i })
          .eq("id", t.id),
      ),
    );
    await load();
  }

  const editing = editingId ? items.find((t) => t.id === editingId) : undefined;

  return (
    <div>
      <div className="flex items-start gap-3 bg-[#F5F2FA] border border-[rgba(139,127,168,0.15)] rounded-xl px-4 py-3 mb-5">
        <span className="text-[16px] flex-shrink-0">💡</span>
        <div>
          <p className="text-[12px] text-[#6B5F88] font-light leading-relaxed">
            Les citations de collaborateurs créent de la confiance authentique — bien plus
            qu'une liste de valeurs. Un candidat qui lit une vraie expérience de salarié est{" "}
            <strong className="font-medium">3× plus susceptible</strong> d'accepter l'offre.
          </p>
          <p className="text-[11px] text-grey mt-1 font-light">
            Maximum {MAX_TESTIMONIALS} citations · Photos optionnelles · Seul le prénom est
            affiché
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-20 bg-[#F0EBE8] rounded-xl animate-pulse" />
      ) : (
        <>
          {items.length > 0 && (
            <div className="space-y-3 mb-4">
              {items.map((t, i) => (
                <TestimonialCard
                  key={t.id}
                  t={t}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                  onEdit={() => {
                    setEditingId(t.id);
                    setShowForm(true);
                  }}
                  onToggle={() => toggleActive(t.id, t.is_active)}
                  onDelete={() => remove(t.id)}
                  onMoveUp={() => reorder(t.id, "up")}
                  onMoveDown={() => reorder(t.id, "down")}
                />
              ))}
            </div>
          )}

          {items.length === 0 && !showForm && (
            <div className="border-2 border-dashed border-[rgba(45,38,64,0.12)] rounded-xl p-6 text-center mb-4">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-[13px] font-medium text-aubergine mb-1">
                Aucune citation pour l'instant
              </p>
              <p className="text-[11px] text-grey font-light">
                Demandez à vos collaborateurs de partager leur expérience en quelques mots.
              </p>
            </div>
          )}

          {showForm && (
            <TestimonialForm
              organizationId={organizationId}
              editing={editing}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              onSaved={async () => {
                setShowForm(false);
                setEditingId(null);
                await load();
              }}
            />
          )}

          {!showForm && items.length < MAX_TESTIMONIALS && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-xl text-[12px] font-medium text-[#524970] hover:bg-[#F5F2FA] hover:border-[rgba(139,127,168,0.3)] transition-all"
            >
              <Plus size={14} /> Ajouter une citation
            </button>
          )}

          {items.length >= MAX_TESTIMONIALS && (
            <p className="text-[11px] text-grey font-light mt-2">
              Maximum {MAX_TESTIMONIALS} citations atteint — supprimez une citation pour en
              ajouter une nouvelle.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TestimonialCard({
  t,
  isFirst,
  isLast,
  onEdit,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  t: EmployeeTestimonial;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        t.is_active
          ? "border-[rgba(45,38,64,0.1)] bg-white"
          : "border-[rgba(45,38,64,0.06)] bg-[#FAFAF9] opacity-60"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex-shrink-0">
          {t.avatar_url ? (
            <img
              src={t.avatar_url}
              alt={t.first_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#F0EBE8] flex items-center justify-center font-serif text-[18px] text-[#8B7FA8]">
              {t.first_name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-aubergine font-light leading-relaxed italic mb-2">
            « {t.quote} »
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium text-[#524970]">{t.first_name}</span>
            <span className="text-[11px] text-grey">·</span>
            <span className="text-[11px] text-grey">{t.job_title}</span>
            {t.seniority_years != null && (
              <>
                <span className="text-[11px] text-grey">·</span>
                <span className="text-[11px] text-grey">
                  {t.seniority_years} an{t.seniority_years > 1 ? "s" : ""} d'ancienneté
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
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-6 h-6 flex items-center justify-center text-grey hover:text-[#524970] disabled:opacity-30"
              title="Monter"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-6 h-6 flex items-center justify-center text-grey hover:text-[#524970] disabled:opacity-30"
              title="Descendre"
            >
              <ChevronDown size={12} />
            </button>
          </div>
          <button
            onClick={onToggle}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              t.is_active
                ? "text-grey hover:text-[#524970]"
                : "text-[#C4A882] hover:text-[#9B7840]"
            }`}
            title={t.is_active ? "Masquer" : "Afficher"}
          >
            {t.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center text-grey hover:text-[#524970] rounded-lg"
            title="Modifier"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-grey hover:text-[#B85A6A] rounded-lg"
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialForm({
  organizationId,
  editing,
  onCancel,
  onSaved,
}: {
  organizationId: string;
  editing?: EmployeeTestimonial;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState(editing?.first_name ?? "");
  const [jobTitle, setJobTitle] = useState(editing?.job_title ?? "");
  const [seniorityYears, setSeniorityYears] = useState<number | null>(
    editing?.seniority_years ?? null,
  );
  const [quote, setQuote] = useState(editing?.quote ?? "");
  const [quoteContext, setQuoteContext] = useState(editing?.quote_context ?? "");
  const [avatarUrl, setAvatarUrl] = useState(editing?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, avatar: "Format non supporté. JPG, PNG ou WebP." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, avatar: "Photo trop lourde. Max 2 Mo." }));
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("testimonial-avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      setErrors((e) => ({ ...e, avatar: "Erreur lors de l'upload." }));
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("testimonial-avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      setErrors((e) => {
        const n = { ...e };
        delete n.avatar;
        return n;
      });
    }
    setUploading(false);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Le prénom est requis";
    if (!jobTitle.trim()) errs.jobTitle = "Le poste est requis";
    if (!quote.trim()) errs.quote = "La citation est requise";
    if (quote.length > QUOTE_MAX) errs.quote = `Maximum ${QUOTE_MAX} caractères`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      organization_id: organizationId,
      first_name: firstName.trim(),
      job_title: jobTitle.trim(),
      seniority_years: seniorityYears,
      quote: quote.trim(),
      quote_context: quoteContext.trim() || null,
      avatar_url: avatarUrl || null,
    };
    const { error } = editing
      ? await supabase
          .from("employee_testimonials" as any)
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("employee_testimonials" as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erreur d'enregistrement");
      return;
    }
    toast.success(editing ? "Citation modifiée" : "Citation ajoutée");
    await onSaved();
  }

  const inputCls =
    "w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.15)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-[#8B7FA8]";
  const labelCls =
    "text-[11px] uppercase tracking-wider text-grey font-medium block mb-1";

  return (
    <div className="bg-[#F5F2FA] border border-[rgba(139,127,168,0.15)] rounded-xl p-5 mt-3">
      <div className="text-[13px] font-medium text-aubergine mb-4">
        {editing ? "Modifier la citation" : "Nouvelle citation"}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2">
          <label className={labelCls}>
            Photo de profil
            <span className="text-grey font-normal ml-1 normal-case tracking-normal">
              (optionnel)
            </span>
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F0EBE8] border-2 border-white overflow-hidden flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-[22px] text-[#8B7FA8]">
                  {firstName[0] ?? "?"}
                </span>
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-[rgba(45,38,64,0.15)] rounded-lg text-[12px] text-[#524970] font-medium hover:bg-white transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatar(f);
                  }}
                />
                {uploading ? "Upload…" : avatarUrl ? "Changer" : "+ Ajouter une photo"}
              </label>
              <p className="text-[10px] text-[#B8AECF] font-light mt-1">
                JPG, PNG ou WebP · Max 2 Mo
              </p>
              {errors.avatar && (
                <p className="text-[10px] text-[#B85A6A] mt-1">{errors.avatar}</p>
              )}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="text-[10px] text-grey mt-1 hover:text-[#B85A6A]"
                >
                  Supprimer la photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Prénom *</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Sophie"
            maxLength={50}
            className={inputCls}
          />
          {errors.firstName && (
            <p className="text-[10px] text-[#B85A6A] mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Poste *</label>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Senior Product Manager"
            maxLength={80}
            className={inputCls}
          />
          {errors.jobTitle && (
            <p className="text-[10px] text-[#B85A6A] mt-1">{errors.jobTitle}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Ancienneté
            <span className="text-grey font-normal ml-1 normal-case tracking-normal">
              (optionnel)
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={seniorityYears ?? ""}
              onChange={(e) =>
                setSeniorityYears(e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="2"
              min={0}
              max={30}
              className={`${inputCls} pr-12`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-grey">
              an(s)
            </span>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Contexte
            <span className="text-grey font-normal ml-1 normal-case tracking-normal">
              (optionnel)
            </span>
          </label>
          <select
            value={quoteContext}
            onChange={(e) => setQuoteContext(e.target.value)}
            className={inputCls}
          >
            <option value="">Sans contexte</option>
            <option value="Sur l'équipe">Sur l'équipe</option>
            <option value="Sur le management">Sur le management</option>
            <option value="Sur la culture">Sur la culture</option>
            <option value="Sur l'equity">Sur l'equity</option>
            <option value="Sur la flexibilité">Sur la flexibilité</option>
            <option value="Sur la formation">Sur la formation</option>
            <option value="Sur l'impact">Sur l'impact</option>
            <option value="Sur l'ambiance">Sur l'ambiance</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Citation *</label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value.slice(0, QUOTE_MAX))}
            placeholder="Ce qui m'a le plus surpris en rejoignant cette équipe, c'est…"
            rows={3}
            className={`${inputCls} h-20 resize-none pt-2 leading-relaxed`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.quote ? (
              <p className="text-[10px] text-[#B85A6A]">{errors.quote}</p>
            ) : (
              <p className="text-[10px] text-[#B8AECF] font-light">
                Authentique, concret, personnel. Évitez les formules marketing.
              </p>
            )}
            <span
              className={`text-[10px] font-medium ${quote.length > QUOTE_MAX * 0.9 ? "text-[#B85A6A]" : "text-[#B8AECF]"}`}
            >
              {quote.length}/{QUOTE_MAX}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-[rgba(45,38,64,0.15)] rounded-xl text-[13px] text-[#524970] hover:bg-white transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-2.5 bg-aubergine text-lin rounded-xl text-[13px] font-medium disabled:opacity-50 hover:bg-[#3D3554] transition-colors"
        >
          {saving
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Ajouter la citation"}
        </button>
      </div>
    </div>
  );
}
