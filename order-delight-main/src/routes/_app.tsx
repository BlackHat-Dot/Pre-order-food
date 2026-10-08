import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { healthApi } from "@/lib/api";

import { PO_CSS } from "@/components/app/PublicNav";
import { NotificationBell } from "@/components/app/NotificationBell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    let active = true;
    healthApi
      .check()
      .then(() => {
        if (active) setBackendHealthy(true);
      })
      .catch(() => {
        if (active) setBackendHealthy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Role gating
  if (path.startsWith("/admin") && user.role !== "admin") {
    return <RedirectTo to="/unauthorized" />;
  }
  if (path.startsWith("/owner") && user.role !== "shop_owner" && user.role !== "admin") {
    return <RedirectTo to="/unauthorized" />;
  }

  return (
    <SidebarProvider>
      <style>{PO_CSS}</style>
      <AppSidebar />
      <SidebarInset className="po">
        <header className="po-nav" style={{ top: 0 }}>
          <div className="in" style={{ maxWidth: "none", height: 56, padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SidebarTrigger />
              {!backendHealthy && (
                <span role="status" style={{ borderLeft: "3px solid var(--sig)", paddingLeft: 8, fontSize: 13 }}>
                  The server isn't responding. Changes may not save.
                </span>
              )}
            </div>
            <nav>
              {user.role === "customer" && <Link to="/cart">Cart{count > 0 ? ` (${count})` : ""}</Link>}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button>{user.name.split(" ")[0]}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{user.phone}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </header>
        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function RedirectTo({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to });
  }, [navigate, to]);
  return null;
}
