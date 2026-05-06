import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Star,
  User2,
  Users,
  Sparkles,
  Receipt,
  Utensils,
  ShieldCheck,
  Gift,
  LogOut,
  BarChart3,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Store;
  badge?: string;
}

const customerNav: NavItem[] = [
  { title: "Browse shops", url: "/", icon: Store },
  { title: "My orders", url: "/orders", icon: ShoppingBag },
  { title: "Loyalty rewards", url: "/loyalty", icon: Sparkles },
  { title: "Profile", url: "/profile", icon: User2 },
];

const ownerNav: NavItem[] = [
  { title: "My shops", url: "/owner", icon: Store },
  { title: "Profile", url: "/profile", icon: User2 },
];

const adminNav: NavItem[] = [
  { title: "Command Center", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Shops", url: "/admin/shops", icon: Store },
  { title: "Orders", url: "/admin/orders", icon: Receipt },
  { title: "Loyalty", url: "/admin/loyalty", icon: Gift },
  { title: "Profile", url: "/profile", icon: User2 },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  let items = customerNav;
  let label = "Customer";
  let roleColor = "text-emerald-400";
  let Icon = ShoppingBag;

  if (user?.role === "shop_owner") {
    items = ownerNav;
    label = "Shop Owner";
    roleColor = "text-blue-400";
    Icon = Utensils;
  } else if (user?.role === "admin") {
    items = adminNav;
    label = "Administrator";
    roleColor = "text-amber-400";
    Icon = ShieldCheck;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Utensils className="h-4 w-4" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">PreOrder</span>
            <span className="text-xs text-muted-foreground">Skip the queue</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Icon className={`h-3 w-3 ${roleColor}`} />
            <span className={`text-xs font-semibold ${roleColor}`}>{label}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(path, item.url)}
                    tooltip={item.title}
                    className="transition-all"
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs h-4 px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-2">
        {user && (
          <>
            <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
            <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold uppercase">
                  {user.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground hover:text-destructive w-full"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden ml-2">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function isActive(current: string, target: string): boolean {
  if (target === "/" ) return current === "/";
  if (target === "/admin") return current === "/admin";
  if (target === "/owner") return current === "/owner";
  return current.startsWith(target + "/") || current === target;
}
