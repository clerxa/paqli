import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function LogoUploader({
  organizationId,
  value,
  onChange,
}: {
  organizationId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Format non supporté (PNG, JPG, WEBP ou SVG)");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image trop lourde (max 2 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${organizationId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logo importé — pensez à enregistrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'import");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-20 h-20 rounded-xl border border-[rgba(45,38,64,0.12)] bg-[#FAF8F5] flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? (
          <img src={value} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <span className="text-[10px] text-grey">Aucun logo</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-aubergine text-lin disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            {uploading ? "Import…" : value ? "Remplacer" : "Importer"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg border border-[rgba(45,38,64,0.15)] text-grey hover:text-aubergine"
            >
              <X size={12} /> Retirer
            </button>
          )}
        </div>
        <p className="text-[10px] text-grey mt-2 leading-relaxed">
          PNG, JPG, WEBP ou SVG · 2 Mo max · format carré recommandé
        </p>
      </div>
    </div>
  );
}
