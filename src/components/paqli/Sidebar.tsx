import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Briefcase,
  Link as LinkIcon,
  Users,
  GraduationCap,
  Award,
  Settings,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { useMobileNav } from "./MobileNav";

interface NavItem {
  to?: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

const main: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Offres d'emploi", icon: Briefcase },
  { to: "/packages", label: "Packages", icon: Package, badge: 4 },
  { to: "/candidates", label: "Liens envoyés", icon: LinkIcon },
  { to: "/candidates", label: "Candidats", icon: Users },
];

const formation: NavItem[] = [
  { label: "Académie RH", icon: GraduationCap, disabled: true },
  { label: "Certifications", icon: Award, disabled: true },
];

const tertiary: NavItem[] = [{ to: "/settings", label: "Paramètres", icon: Settings }];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const base =
    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors";
  if (item.disabled) {
    return (
      <div
        className={`${base} cursor-not-allowed`}
        style={{ color: "rgba(184,174,207,0.5)" }}
      >
        <Icon size={16} />
        <span className="flex-1">{item.label}</span>
        <span
          className="text-[9px] uppercase tracking-wider px-[6px] py-[2px] rounded"
          style={{ background: "rgba(250,248,245,0.06)", color: "#B8AECF" }}
        >
          Bientôt
        </span>
      </div>
    );
  }
  return (
    <Link
      to={item.to!}
      className={base}
      style={
        active
          ? { background: "rgba(250,248,245,0.10)", color: "#FAF8F5" }
          : { color: "#B8AECF" }
      }
      activeProps={{
        style: { background: "rgba(250,248,245,0.10)", color: "#FAF8F5" },
      }}
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className="text-[10px] font-semibold px-[7px] py-[2px] rounded-[20px]"
          style={{ background: "#C4A882", color: "#2D2640" }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 mt-6 mb-2 text-[10px] uppercase tracking-[0.12em] font-semibold"
      style={{ color: "rgba(184,174,207,0.6)" }}
    >
      {children}
    </div>
  );
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, organization, signOut, user } = useAuth();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Invité";
  const initials =
    (profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
      (user?.email ?? "RH").slice(0, 2).toUpperCase()) ?? "RH";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{ width: 220, background: "#2D2640", minHeight: "100vh" }}
    >
      <div className="px-5 pt-6 pb-2">
        <Logo variant="light" />
      </div>

      <nav className="flex-1 px-3 pt-6 overflow-y-auto">
        {main.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={!!item.to && pathname.startsWith(item.to)}
          />
        ))}

        <SectionLabel>Formation</SectionLabel>
        {formation.map((item) => (
          <NavLink key={item.label} item={item} active={false} />
        ))}

        <SectionLabel>Compte</SectionLabel>
        {tertiary.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={!!item.to && pathname.startsWith(item.to)}
          />
        ))}
      </nav>

      <div
        className="flex items-center gap-3 px-3 py-3 mx-3 mb-3 rounded-lg"
        style={{ background: "rgba(250,248,245,0.04)" }}
      >
        <div
          className="flex items-center justify-center rounded-full text-[12px] font-semibold shrink-0"
          style={{ width: 32, height: 32, background: "#C4A882", color: "#2D2640" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-lin truncate">{displayName}</div>
          <div className="text-[10px] truncate" style={{ color: "#B8AECF" }}>
            {organization?.name ?? "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Se déconnecter"
          className="p-1.5 rounded-md transition-colors hover:bg-[rgba(250,248,245,0.08)]"
          style={{ color: "#B8AECF" }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
