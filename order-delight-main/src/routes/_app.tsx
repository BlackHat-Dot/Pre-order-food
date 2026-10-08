import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/lib/auth";
import { ShoppingBag, User2, LogOut, AlertTriangle } from "lucide-react";
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
import { useCart, cart, CartLine } from "@/lib/cart";
import { healthApi, shopsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

// ========================================================
// 🚀 UPGRADED CROSS-SHOP CONFLICT MODAL (EXPLICIT SHOP NAMES)
// ========================================================
function GlobalCartConflictModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLine, setPendingLine] = useState<CartLine | null>(null);
  
  const currentCart = cart.all();
  const existingShopId = currentCart[0]?.shop_id;
  const incomingShopId = pendingLine?.shop_id;

  // 1. Fetch current shop name in cart
  const { data: oldShop } = useQuery({
    queryKey: ["shop", existingShopId],
    queryFn: () => shopsApi.get(existingShopId!),
    enabled: !!existingShopId && isOpen,
  });

  // 2. Fetch the incoming item's shop name
  const { data: newShop } = useQuery({
    queryKey: ["shop", incomingShopId],
    queryFn: () => shopsApi.get(incomingShopId!),
    enabled: !!incomingShopId && isOpen,
  });

  useEffect(() => {
    const handleConflict = (e: Event) => {
      const customEvent = e as CustomEvent<{ pendingLine: CartLine }>;
      setPendingLine(customEvent.detail.pendingLine);
      setIsOpen(true);
    };

    window.addEventListener("pof_cart_conflict", handleConflict);
    return () => window.removeEventListener("pof_cart_conflict", handleConflict);
  }, []);

  const handleConfirmReplacement = () => {
    if (pendingLine) {
      cart.add(pendingLine, true);
    }
    setIsOpen(false);
    setPendingLine(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="bg-amber-500/10 text-amber-500 p-3 rounded-2xl border border-amber-500/20 animate-bounce">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-black tracking-tight text-foreground">
            Switch restaurants?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Your cart already contains selections from{" "}
            <span className="font-bold text-foreground">
              {oldShop?.name || "another restaurant"}
            </span>
            . 
            <br /><br />
            Would you like to clear your current cart and replace it with your new item from{" "}
            <span className="font-bold text-primary">
              {newShop?.name || "this restaurant"}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-center pt-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="rounded-xl text-xs h-10 order-2 sm:order-1 flex-1 font-medium"
          >
            Keep Existing Items
          </Button>
          <Button
            type="button"
            onClick={handleConfirmReplacement}
            className="rounded-xl text-xs h-10 order-1 sm:order-2 flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold shadow-md shadow-destructive/10"
          >
            Replace Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          {!backendHealthy && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
              Backend unavailable
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {user.role === "customer" && (
              <Link to="/cart">
                <Button variant="ghost" size="sm" className="gap-2 relative">
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
                <DropdownMenuSeparator />
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
      <GlobalCartConflictModal />
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