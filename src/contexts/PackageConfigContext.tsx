import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { upsertPackage } from "@/lib/packageService";
import {
  emptyConfig,
  type PackageConfig,
} from "@/lib/packageConfig";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

interface Ctx {
  config: PackageConfig;
  setConfig: React.Dispatch<React.SetStateAction<PackageConfig>>;
  patch: (p: Partial<PackageConfig>) => void;
  saveDraft: () => Promise<void>;
  saveState: SaveState;
}

const PackageConfigContext = createContext<Ctx | null>(null);

export function PackageConfigProvider({
  initial,
  children,
}: {
  initial?: PackageConfig | null;
  children: ReactNode;
}) {
  const { user, organization } = useAuth();
  const [config, setConfig] = useState<PackageConfig>(initial ?? emptyConfig);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If initial loads asynchronously
  useEffect(() => {
    if (initial) setConfig(initial);
  }, [initial]);

  const patch = useCallback((p: Partial<PackageConfig>) => {
    setConfig((prev) => ({ ...prev, ...p, isDirty: true }));
    setSaveState("dirty");
  }, []);

  const saveDraft = useCallback(async () => {
    if (!user || !organization) return;
    setSaveState("saving");
    try {
      const id = await upsertPackage(
        { ...config, status: "draft" },
        organization.id,
        user.id,
      );
      setConfig((prev) => ({ ...prev, packageId: id, isDirty: false }));
      setSaveState("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("saveDraft", e);
      toast.error("Échec de la sauvegarde");
      setSaveState("dirty");
    }
  }, [config, user, organization]);

  // Debounced auto-save
  useEffect(() => {
    if (!config.isDirty) return;
    const t = setTimeout(() => {
      saveDraft();
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const value = useMemo(
    () => ({ config, setConfig, patch, saveDraft, saveState }),
    [config, patch, saveDraft, saveState],
  );

  return (
    <PackageConfigContext.Provider value={value}>
      {children}
    </PackageConfigContext.Provider>
  );
}

export function usePackageConfig() {
  const ctx = useContext(PackageConfigContext);
  if (!ctx)
    throw new Error("usePackageConfig must be used inside PackageConfigProvider");
  return ctx;
}
