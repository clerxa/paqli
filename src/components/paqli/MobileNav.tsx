import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileNavCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<MobileNavCtx | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{ open, setOpen, toggle: () => setOpen(!open) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMobileNav() {
  const c = useContext(Ctx);
  if (!c) return { open: false, setOpen: () => {}, toggle: () => {} };
  return c;
}
