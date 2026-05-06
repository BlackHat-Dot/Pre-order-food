import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/lib/auth";
import { ShoppingBag, User2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

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
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            {user.role === "customer" && (
              <Link to="/cart">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  {count > 0 && (
                    <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User2 className="h-4 w-4" />
                  {user.name.split(" ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
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
