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
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Store;
}

const customerNav: NavItem[] = [
  { title: "Browse shops", url: "/", icon: Store },
  { title: "My orders", url: "/orders", icon: ShoppingBag },
  { title: "Loyalty", url: "/loyalty", icon: Sparkles },
  { title: "Profile", url: "/profile", icon: User2 },
];

const ownerNav: NavItem[] = [
  { title: "My shops", url: "/owner", icon: Store },
  { title: "Profile", url: "/profile", icon: User2 },
];

const adminNav: NavItem[] = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
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
  let Icon = ShoppingBag;
  if (user?.role === "shop_owner") {
    items = ownerNav;
    label = "Shop owner";
    Icon = Utensils;
  } else if (user?.role === "admin") {
    items = adminNav;
    label = "Admin";
    Icon = ShieldCheck;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Utensils className="h-4 w-4" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">PreOrder</span>
            <span className="text-xs text-muted-foreground">Skip the line</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Icon className="mr-2 h-3.5 w-3.5" /> {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(path, item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <div className="truncate font-medium text-foreground">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => logout()}
        >
          <Star className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function isActive(current: string, target: string): boolean {
  if (target === "/") return current === "/";
  return current === target || current.startsWith(target + "/");
}
