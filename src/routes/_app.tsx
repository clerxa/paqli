import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/paqli/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen w-full" style={{ background: "#FAF8F5" }}>
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
