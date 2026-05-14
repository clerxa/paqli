import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/paqli/Sidebar";
import { MobileNavProvider } from "@/components/paqli/MobileNav";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    } else if (!profile) {
      navigate({ to: "/welcome", replace: true });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile) {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center"
        style={{ background: "#FAF8F5" }}
      />
    );
  }

  return (
    <MobileNavProvider>
      <div
        className="flex min-h-screen w-full"
        style={{ background: "#FAF8F5" }}
      >
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </MobileNavProvider>
  );
}
