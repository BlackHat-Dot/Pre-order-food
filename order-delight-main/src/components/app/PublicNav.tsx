import { Link } from "@tanstack/react-router";
import { Utensils, ShoppingBag, User2, LogOut, Store, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { landingForRole } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./NotificationBell";

export function PublicNav() {
  const { user, logout } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand Logo Anchor */}
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Utensils className="h-4 w-4" />
          </span>
          <span className="text-lg">PreOrder</span>
        </Link>

        {/* Action Controls Group */}
        <nav className="flex items-center gap-2">
          <Link to="/cart">
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
              <ShoppingBag className="h-4 w-4" />
              <span>Cart</span>
              {count > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground animate-in zoom-in duration-200">
                  {count}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <>
              {/* 🚀 RESTORED: Your fully functional live Notification Bell */}
              <NotificationBell />
              
              {/* User Session Dashboard Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                    <User2 className="h-4 w-4" /> 
                    <span>{user.name.split(" ")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl p-1 shadow-lg mt-1">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5 truncate">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link to={landingForRole(user.role)}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> 
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="rounded-xl">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="rounded-xl">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// 🚀 CRITICAL COMPILATION LINK: Default export interface mapping
export default PublicNav;